from __future__ import annotations

import io
import math
import wave
from dataclasses import dataclass

import numpy as np


class AudioValidationError(ValueError):
    pass


@dataclass
class WavAudio:
    samples: np.ndarray
    sample_rate: int
    channels: int
    sample_width: int


def decode_pcm_wav(data: bytes) -> WavAudio:
    try:
        with wave.open(io.BytesIO(data), "rb") as wav:
            channels = wav.getnchannels()
            sample_width = wav.getsampwidth()
            sample_rate = wav.getframerate()
            frames = wav.getnframes()
            comptype = wav.getcomptype()
            raw = wav.readframes(frames)
    except wave.Error as exc:
        raise AudioValidationError("File must be a valid PCM WAV.") from exc

    if comptype != "NONE":
        raise AudioValidationError("Compressed WAV is not supported in the POC.")
    if channels not in (1, 2):
        raise AudioValidationError("POC supports mono or stereo WAV only.")
    if sample_width != 2:
        raise AudioValidationError("POC currently supports 16-bit PCM WAV only.")
    if not 8_000 <= sample_rate <= 192_000:
        raise AudioValidationError("Unsupported sample rate.")
    if frames <= 0:
        raise AudioValidationError("WAV contains no audio frames.")

    pcm = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    if channels == 2:
        pcm = pcm.reshape(-1, 2)
    else:
        pcm = pcm.reshape(-1, 1)

    return WavAudio(samples=pcm, sample_rate=sample_rate, channels=channels, sample_width=sample_width)


def to_mono(audio: WavAudio) -> np.ndarray:
    return audio.samples.mean(axis=1).astype(np.float32)


def analyze(audio: WavAudio) -> dict[str, float | int | bool]:
    mono = to_mono(audio)
    eps = 1e-12
    peak = float(np.max(np.abs(mono)))
    rms = float(np.sqrt(np.mean(np.square(mono))) + eps)
    peak_dbfs = 20.0 * math.log10(max(peak, eps))
    rms_dbfs = 20.0 * math.log10(max(rms, eps))
    crest_db = peak_dbfs - rms_dbfs
    clipping_ratio = float(np.mean(np.abs(mono) >= 0.999))
    dc_offset = float(np.mean(mono))
    zcr = float(np.mean(np.abs(np.diff(np.signbit(mono)).astype(np.float32))))
    duration = len(mono) / audio.sample_rate

    score = 100.0
    if clipping_ratio > 0.001:
        score -= min(35.0, clipping_ratio * 5000.0)
    if rms_dbfs < -35.0:
        score -= min(25.0, (-35.0 - rms_dbfs) * 1.2)
    if peak_dbfs < -18.0:
        score -= min(15.0, (-18.0 - peak_dbfs) * 0.8)
    if abs(dc_offset) > 0.01:
        score -= min(15.0, abs(dc_offset) * 500.0)
    if duration < 3.0:
        score -= 15.0
    score = max(0.0, min(100.0, score))

    return {
        "duration_seconds": round(duration, 3),
        "sample_rate_hz": audio.sample_rate,
        "channels": audio.channels,
        "bit_depth": audio.sample_width * 8,
        "peak_dbfs": round(peak_dbfs, 2),
        "rms_dbfs": round(rms_dbfs, 2),
        "crest_factor_db": round(crest_db, 2),
        "clipping_ratio": round(clipping_ratio, 6),
        "dc_offset": round(dc_offset, 6),
        "zero_crossing_rate": round(zcr, 6),
        "quality_score": round(score, 1),
        "training_readiness": score >= 70.0 and duration >= 5.0,
    }


def _high_pass_one_pole(x: np.ndarray, sample_rate: int, cutoff_hz: float = 70.0) -> np.ndarray:
    rc = 1.0 / (2.0 * math.pi * cutoff_hz)
    dt = 1.0 / sample_rate
    alpha = rc / (rc + dt)
    y = np.zeros_like(x, dtype=np.float32)
    for i in range(1, len(x)):
        y[i] = alpha * (y[i - 1] + x[i] - x[i - 1])
    return y


def _presence_emphasis(x: np.ndarray, amount: float = 0.15) -> np.ndarray:
    if len(x) < 3:
        return x
    delayed = np.concatenate(([x[0]], x[:-1]))
    detail = x - delayed
    return (x + amount * detail).astype(np.float32)


def _soft_compress(x: np.ndarray, drive: float = 1.35) -> np.ndarray:
    denom = math.tanh(drive)
    return (np.tanh(x * drive) / denom).astype(np.float32)


def restore(audio: WavAudio, strength: float) -> WavAudio:
    strength = max(0.0, min(1.0, strength))
    restored_channels: list[np.ndarray] = []

    for ch in range(audio.channels):
        source = audio.samples[:, ch].astype(np.float32)
        cleaned = source - float(np.mean(source))
        cleaned = _high_pass_one_pole(cleaned, audio.sample_rate)
        cleaned = _presence_emphasis(cleaned, 0.10 + 0.18 * strength)
        cleaned = _soft_compress(cleaned, 1.1 + 0.5 * strength)

        peak = float(np.max(np.abs(cleaned)))
        if peak > 0:
            cleaned = cleaned * min(1.0, 0.94 / peak)

        mixed = (1.0 - strength) * source + strength * cleaned
        restored_channels.append(np.clip(mixed, -0.98, 0.98))

    out = np.stack(restored_channels, axis=1).astype(np.float32)
    return WavAudio(samples=out, sample_rate=audio.sample_rate, channels=audio.channels, sample_width=2)


def encode_pcm16_wav(audio: WavAudio) -> bytes:
    pcm = np.clip(audio.samples, -1.0, 0.9999695)
    raw = (pcm * 32768.0).astype("<i2").tobytes()

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(audio.channels)
        wav.setsampwidth(2)
        wav.setframerate(audio.sample_rate)
        wav.writeframes(raw)
    return buffer.getvalue()


def generate_test_wav(duration_seconds: float = 6.0, sample_rate: int = 48_000) -> bytes:
    duration_seconds = max(1.0, min(30.0, duration_seconds))
    t = np.arange(int(duration_seconds * sample_rate), dtype=np.float32) / sample_rate
    base = 0.24 * np.sin(2 * np.pi * 196.0 * t)
    harmonic = 0.08 * np.sin(2 * np.pi * 392.0 * t)
    vibrato = 1.0 + 0.06 * np.sin(2 * np.pi * 5.2 * t)
    envelope = np.minimum(1.0, t / 0.15) * np.minimum(1.0, (duration_seconds - t) / 0.2)
    signal = (base + harmonic) * vibrato * np.clip(envelope, 0.0, 1.0)
    audio = WavAudio(signal.reshape(-1, 1).astype(np.float32), sample_rate, 1, 2)
    return encode_pcm16_wav(audio)


def reference_profile(audio: WavAudio) -> dict[str, float]:
    """Extract a lightweight, non-biometric DSP target profile from authorized reference audio."""
    mono = to_mono(audio)
    eps = 1e-12
    rms = float(np.sqrt(np.mean(np.square(mono))) + eps)
    peak = float(np.max(np.abs(mono)) + eps)
    crest_db = 20.0 * math.log10(peak / rms)
    zcr = float(np.mean(np.abs(np.diff(np.signbit(mono)).astype(np.float32))))

    window = np.hanning(len(mono)).astype(np.float32)
    spectrum = np.abs(np.fft.rfft(mono * window))
    freqs = np.fft.rfftfreq(len(mono), d=1.0 / audio.sample_rate)
    total = float(np.sum(spectrum) + eps)
    centroid = float(np.sum(freqs * spectrum) / total)

    low_mask = freqs < 500.0
    presence_mask = (freqs >= 2000.0) & (freqs <= 5000.0)
    high_mask = freqs > 5000.0
    low_ratio = float(np.sum(spectrum[low_mask]) / total)
    presence_ratio = float(np.sum(spectrum[presence_mask]) / total)
    high_ratio = float(np.sum(spectrum[high_mask]) / total)

    return {
        "rms_dbfs": round(20.0 * math.log10(max(rms, eps)), 2),
        "crest_factor_db": round(crest_db, 2),
        "zero_crossing_rate": round(zcr, 6),
        "spectral_centroid_hz": round(centroid, 1),
        "low_energy_ratio": round(low_ratio, 4),
        "presence_energy_ratio": round(presence_ratio, 4),
        "high_energy_ratio": round(high_ratio, 4),
    }


def restore_to_reference(source: WavAudio, reference: WavAudio, strength: float) -> tuple[WavAudio, dict[str, float]]:
    """Condition the DSP restoration using broad acoustic characteristics from a reference WAV.

    This is a Milestone 2 profile-matching POC, not voice cloning or identity synthesis.
    """
    strength = max(0.0, min(1.0, strength))
    profile = reference_profile(reference)
    source_profile = reference_profile(source)

    target_presence = profile["presence_energy_ratio"]
    source_presence = source_profile["presence_energy_ratio"]
    presence_delta = max(-0.12, min(0.20, (target_presence - source_presence) * 3.0))

    target_crest = profile["crest_factor_db"]
    source_crest = source_profile["crest_factor_db"]
    compression_delta = max(-0.25, min(0.45, (source_crest - target_crest) / 12.0))

    target_rms = profile["rms_dbfs"]
    restored_channels: list[np.ndarray] = []

    for ch in range(source.channels):
        original = source.samples[:, ch].astype(np.float32)
        cleaned = original - float(np.mean(original))
        cleaned = _high_pass_one_pole(cleaned, source.sample_rate)
        cleaned = _presence_emphasis(cleaned, 0.10 + 0.16 * strength + presence_delta * strength)
        cleaned = _soft_compress(cleaned, max(0.9, 1.1 + 0.45 * strength + compression_delta * strength))

        current_rms = float(np.sqrt(np.mean(np.square(cleaned))) + 1e-12)
        desired_rms = 10.0 ** (target_rms / 20.0)
        gain = max(0.7, min(1.35, desired_rms / current_rms))
        cleaned = cleaned * (1.0 + (gain - 1.0) * strength)

        peak = float(np.max(np.abs(cleaned)))
        if peak > 0:
            cleaned = cleaned * min(1.0, 0.94 / peak)

        mixed = (1.0 - strength) * original + strength * cleaned
        restored_channels.append(np.clip(mixed, -0.98, 0.98))

    out = np.stack(restored_channels, axis=1).astype(np.float32)
    return WavAudio(samples=out, sample_rate=source.sample_rate, channels=source.channels, sample_width=2), profile
