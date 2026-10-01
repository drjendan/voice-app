import { AudioLines, LockKeyhole, Mic2, ShieldCheck, Users } from "lucide-react";

const cards = [
  { label: "Artists", value: "0", detail: "No artists enrolled yet", icon: Users },
  { label: "Protected Assets", value: "0", detail: "Encrypted recordings & models", icon: LockKeyhole },
  { label: "Voice Models", value: "0", detail: "Authorized models only", icon: AudioLines },
  { label: "Security Events", value: "0", detail: "No unresolved events", icon: ShieldCheck },
];

export function DashboardPage() {
  return (
    <div className="stack">
      <div className="hero-card">
        <div>
          <span className="eyebrow">Secure by design</span>
          <h2>Protect the artist. Preserve the voice.</h2>
          <p>
            The platform keeps historical recordings, training material, and voice models inside isolated artist vaults.
            Model use requires active authorization and every sensitive action is auditable.
          </p>
        </div>
        <div className="hero-icon"><Mic2 size={46} /></div>
      </div>

      <div className="metric-grid">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <article className="metric-card" key={label}>
            <div className="metric-icon"><Icon size={20} /></div>
            <div className="metric-value">{value}</div>
            <div className="metric-label">{label}</div>
            <div className="metric-detail">{detail}</div>
          </article>
        ))}
      </div>

      <div className="two-column">
        <article className="panel">
          <div className="panel-heading">
            <h3>Milestone 1 controls</h3>
            <span className="status-pill status-progress">In progress</span>
          </div>
          <ul className="check-list">
            <li>Tenant and artist isolation</li>
            <li>Role-based access control</li>
            <li>Private object storage pattern</li>
            <li>Consent and authorization records</li>
            <li>Audit and security event logging</li>
            <li>Audio/model assets blocked from source control</li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading"><h3>Next validation gate</h3></div>
          <p className="muted">
            Before any real artist material is uploaded, production authentication, MFA, row-level security,
            private buckets, signed access URLs, and secrets management must be configured and verified.
          </p>
        </article>
      </div>
    </div>
  );
}
