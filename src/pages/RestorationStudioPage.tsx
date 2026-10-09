import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { AudioLines, Download, FlaskConical, History, RotateCcw, WandSparkles } from "lucide-react";

type Analysis = {
  duration_seconds: number;
  sample_rate_hz: number;
  channels: number;
  bit_depth: number;
  peak_dbfs: number;
  rms_dbfs: number;
  crest_factor_db: number;
  clipping_ratio: number;
  dc_offset: number;
  zero_crossing_rate: number;
  quality_score: number;
  training_readiness: boolean;
};

const API_URL = (import.meta.env.VITE_AUDIO_API_URL || "https://evolve-ai-vocal-audio-api.onrender.com").replace(/\/$/, "");

export function RestorationStudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [restoredUrl, setRestoredUrl] = useState("");
  const [strength, setStrength] = useState(55);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState<"analyze"|"restore"|null>(null);
  const [message, setMessage] = useState("Use dummy/test WAV audio until Supabase security verification is fully complete.");
  const [referenceProfile, setReferenceProfile] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
    };
  }, [originalUrl]);

  useEffect(() => {
    return () => {
      if (restoredUrl) URL.revokeObjectURL(restoredUrl);
    };
  }, [restoredUrl]);

  const apiReady = useMemo(() => Boolean(API_URL), []);

  function reset() {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (restoredUrl) URL.revokeObjectURL(restoredUrl);
    setFile(null);
    setReferenceFile(null);
    setReferenceProfile(null);
    setOriginalUrl("");
    setRestoredUrl("");
    setAnalysis(null);
    setStrength(55);
    setMessage("POC reset. Select a 16-bit PCM WAV test file.");
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] || null;
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (restoredUrl) URL.revokeObjectURL(restoredUrl);
    setRestoredUrl("");
    setAnalysis(null);
    setFile(next);
    setOriginalUrl(next ? URL.createObjectURL(next) : "");
    setMessage(next ? next.name + " selected. Analyze it before processing." : "Select a test WAV file.");
  }

  function chooseReference(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] || null;
    setReferenceFile(next);
    setReferenceProfile(null);
    setRestoredUrl("");
    setMessage(next ? next.name + " selected as the historical reference." : "Select an optional historical reference WAV.");
  }

  async function analyzeReference() {
    if (!referenceFile || !API_URL) return;
    setBusy("analyze");
    setMessage("Analyzing historical reference profile…");
    try {
      const form = new FormData();
      form.append("reference", referenceFile);
      const response = await fetch(API_URL + "/v1/poc/reference-profile", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Reference analysis failed");
      setReferenceProfile(payload.profile);
      setMessage("Historical reference profile ready. Process Vocal will now use reference-conditioned DSP.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reference analysis failed.");
    } finally {
      setBusy(null);
    }
  }

  async function analyzeFile() {
    if (!file || !API_URL) return;
    setBusy("analyze");
    setMessage("Analyzing test vocal…");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(API_URL + "/v1/poc/analyze", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Analysis failed");
      setAnalysis(payload);
      setMessage("Analysis complete.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Analysis failed.");
    } finally {
      setBusy(null);
    }
  }

  async function processVocal() {
    if (!file || !API_URL) return;
    setBusy("restore");
    setMessage("Processing restoration POC…");
    try {
      const form = new FormData();
      let endpoint = API_URL + "/v1/poc/restore?strength=" + (strength / 100).toFixed(2);
      if (referenceFile) {
        form.append("current", file);
        form.append("reference", referenceFile);
        endpoint = API_URL + "/v1/poc/restore-reference?strength=" + (strength / 100).toFixed(2);
      } else {
        form.append("file", file);
      }
      const response = await fetch(endpoint, { method: "POST", body: form });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail || "Restoration failed");
      }
      const blob = await response.blob();
      if (restoredUrl) URL.revokeObjectURL(restoredUrl);
      setRestoredUrl(URL.createObjectURL(blob));
      setMessage(referenceFile ? "Reference-conditioned restoration complete. Compare the current and restored audio." : "Restoration complete. Compare the original and restored audio.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Restoration failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Milestone 2 • Reference-Conditioned Studio POC</span>
          <h2>Restoration Studio</h2>
          <p>Analyze a current test vocal, optionally add a historical reference profile, and compare a controlled before/after restoration. Real artist audio remains gated by authorization and security verification.</p>
        </div>
        <span className={apiReady ? "status-pill status-secure" : "status-pill status-progress"}>
          {apiReady ? "Audio API configured" : "Audio API URL needed"}
        </span>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div><h3>Test Vocal</h3><p className="muted">16-bit PCM WAV • dummy/test audio only for this POC stage</p></div>
          <FlaskConical size={22} />
        </div>
        <div className="poc-upload-row">
          <input type="file" accept=".wav,audio/wav" onChange={chooseFile} />
          <button className="secondary-button" disabled={!file || !apiReady || busy !== null} onClick={()=>void analyzeFile()}>
            <AudioLines size={17}/>{busy === "analyze" ? "Analyzing…" : "Analyze"}
          </button>
        </div>
        <div className="form-message">{message}</div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Historical Reference <span className="status-pill">Optional POC target</span></h3>
            <p className="muted">Use a second dummy/test WAV to condition broad acoustic characteristics such as presence, dynamics, and spectral balance. This is not voice cloning.</p>
          </div>
          <History size={22} />
        </div>
        <div className="poc-upload-row">
          <input type="file" accept=".wav,audio/wav" onChange={chooseReference} />
          <button className="secondary-button" disabled={!referenceFile || !apiReady || busy !== null} onClick={()=>void analyzeReference()}>
            <AudioLines size={17}/>{busy === "analyze" ? "Analyzing…" : "Analyze Reference"}
          </button>
        </div>
        {referenceProfile && <div className="analysis-grid reference-profile-grid">
          <div><strong>{referenceProfile.spectral_centroid_hz} Hz</strong><span>Spectral centroid</span></div>
          <div><strong>{referenceProfile.rms_dbfs} dBFS</strong><span>Reference RMS</span></div>
          <div><strong>{referenceProfile.crest_factor_db} dB</strong><span>Crest factor</span></div>
          <div><strong>{Math.round(referenceProfile.presence_energy_ratio * 100)}%</strong><span>Presence energy</span></div>
          <div><strong>{Math.round(referenceProfile.low_energy_ratio * 100)}%</strong><span>Low energy</span></div>
          <div><strong>{Math.round(referenceProfile.high_energy_ratio * 100)}%</strong><span>High energy</span></div>
        </div>}
      </section>

      <div className="studio-grid">
        <section className="panel">
          <div className="panel-heading"><h3>Original Vocal</h3><span className="status-pill">Input</span></div>
          {originalUrl ? <audio className="audio-player" controls src={originalUrl} /> : <div className="wave-placeholder">Select a test WAV file</div>}
        </section>
        <section className="panel">
          <div className="panel-heading"><h3>Restored Vocal</h3><span className="status-pill status-secure">POC output</span></div>
          {restoredUrl ? (
            <>
              <audio className="audio-player" controls src={restoredUrl} />
              <a className="secondary-button download-link" href={restoredUrl} download="evolve-restored-poc.wav"><Download size={17}/> Export test result</a>
            </>
          ) : <div className="wave-placeholder">Processed output appears here</div>}
        </section>
      </div>

      {analysis && (
        <section className="panel">
          <div className="panel-heading"><h3>Audio Intelligence</h3><span className={analysis.training_readiness ? "status-pill status-secure" : "status-pill status-progress"}>{analysis.quality_score}/100 quality</span></div>
          <div className="analysis-grid">
            <div><strong>{analysis.duration_seconds}s</strong><span>Duration</span></div>
            <div><strong>{analysis.sample_rate_hz.toLocaleString()} Hz</strong><span>Sample rate</span></div>
            <div><strong>{analysis.bit_depth}-bit</strong><span>Bit depth</span></div>
            <div><strong>{analysis.peak_dbfs} dBFS</strong><span>Peak</span></div>
            <div><strong>{analysis.rms_dbfs} dBFS</strong><span>RMS</span></div>
            <div><strong>{analysis.training_readiness ? "Ready" : "Review"}</strong><span>Training suitability</span></div>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-heading"><h3>Restoration Controls</h3><span className="status-pill">DSP POC v1</span></div>
        <div className="control-grid">
          <label className="range-control restoration-strength">
            <span>Restoration strength: {strength}%</span>
            <input type="range" min="0" max="100" value={strength} onChange={e=>setStrength(Number(e.target.value))} />
          </label>
          {["Clarity","Presence","Warmth","Breath","Dynamics"].map(label => (
            <label className="range-control" key={label}>
              <span>{label}</span>
              <input type="range" min="0" max="100" defaultValue="50" disabled />
            </label>
          ))}
        </div>
        <div className="button-row">
          <button className="secondary-button" onClick={reset}><RotateCcw size={17}/> Reset</button>
          <button className="primary-button" disabled={!file || !apiReady || busy !== null} onClick={()=>void processVocal()}>
            <WandSparkles size={17}/>{busy === "restore" ? "Processing…" : referenceFile ? "Process to Reference" : "Process Vocal"}
          </button>
        </div>
      </section>
    </div>
  );
}
