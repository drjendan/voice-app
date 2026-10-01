import { Play, RotateCcw, WandSparkles } from "lucide-react";

const controls = ["Restoration", "Clarity", "Presence", "Warmth", "Breath", "Dynamics"];

export function RestorationStudioPage() {
  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Studio mode</span>
          <h2>Restoration Studio</h2>
          <p>Compare a current authorized vocal against an approved historical voice profile without exposing the underlying model.</p>
        </div>
      </div>
      <div className="studio-grid">
        <section className="panel">
          <div className="panel-heading"><h3>Original Vocal</h3><button className="icon-button" disabled><Play size={17} /></button></div>
          <div className="wave-placeholder">Current performance waveform</div>
        </section>
        <section className="panel">
          <div className="panel-heading"><h3>Restored Vocal</h3><button className="icon-button" disabled><Play size={17} /></button></div>
          <div className="wave-placeholder">Processed waveform</div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading"><h3>Restoration Controls</h3><span className="status-pill">POC shell</span></div>
        <div className="control-grid">
          {controls.map((label) => (
            <label className="range-control" key={label}>
              <span>{label}</span>
              <input type="range" min="0" max="100" defaultValue={label === "Restoration" ? 35 : 50} disabled />
            </label>
          ))}
        </div>
        <div className="button-row">
          <button className="secondary-button" disabled><RotateCcw size={17} /> Reset</button>
          <button className="primary-button" disabled><WandSparkles size={17} /> Process Vocal</button>
        </div>
      </section>
    </div>
  );
}
