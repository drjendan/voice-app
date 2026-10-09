from app.audio_engine import analyze, decode_pcm_wav, encode_pcm16_wav, generate_test_wav, reference_profile, restore, restore_to_reference


def test_generated_wav_analyzes():
    wav = decode_pcm_wav(generate_test_wav(2.0))
    metrics = analyze(wav)
    assert metrics["sample_rate_hz"] == 48000
    assert metrics["channels"] == 1
    assert metrics["duration_seconds"] >= 1.9


def test_restoration_returns_valid_wav():
    wav = decode_pcm_wav(generate_test_wav(2.0))
    restored = restore(wav, 0.65)
    encoded = encode_pcm16_wav(restored)
    decoded = decode_pcm_wav(encoded)
    assert decoded.sample_rate == wav.sample_rate
    assert decoded.channels == wav.channels
    assert decoded.samples.shape == wav.samples.shape


def test_strength_changes_signal():
    wav = decode_pcm_wav(generate_test_wav(2.0))
    zero = restore(wav, 0.0)
    strong = restore(wav, 0.8)
    assert (zero.samples != strong.samples).any()


def test_reference_profile_has_acoustic_targets():
    reference = decode_pcm_wav(generate_test_wav(3.0))
    profile = reference_profile(reference)
    assert "spectral_centroid_hz" in profile
    assert "presence_energy_ratio" in profile
    assert profile["spectral_centroid_hz"] > 0


def test_reference_conditioned_restoration_returns_valid_wav():
    current = decode_pcm_wav(generate_test_wav(2.0))
    reference = decode_pcm_wav(generate_test_wav(3.0))
    restored, profile = restore_to_reference(current, reference, 0.65)
    encoded = encode_pcm16_wav(restored)
    decoded = decode_pcm_wav(encoded)
    assert decoded.samples.shape == current.samples.shape
    assert profile["rms_dbfs"] < 0
