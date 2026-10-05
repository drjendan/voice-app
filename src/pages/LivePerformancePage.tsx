import { CircleStop, Mic2, Radio, ShieldAlert } from "lucide-react";

export function LivePerformancePage() {
  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Future low-latency engine</span>
          <h2>Live Performance</h2>
          <p>Microphone or virtual audio input will be processed by an approved artist model and routed to an authorized output.</p>
        </div>
      </div>
      <div className="live-console">
        <div className="signal-card"><Mic2 size={24} /><span>Input</span><strong>Not connected</strong></div>
        <div className="signal-arrow">→</div>
        <div className="signal-card"><Radio size={24} /><span>Secure AI Engine</span><strong>Offline</strong></div>
        <div className="signal-arrow">→</div>
        <div className="signal-card"><CircleStop size={24} /><span>Output</span><strong>Not connected</strong></div>
      </div>
      <div className="emergency-card">
        <ShieldAlert size={22} />
        <div><strong>Performance safety control</strong><p>Production Live Mode will always include a hardware/software bypass path so untreated audio can continue if AI processing fails.</p></div>
        <button className="danger-button" disabled>AI BYPASS</button>
      </div>
    </div>
  );
}
