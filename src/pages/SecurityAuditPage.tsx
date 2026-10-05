import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";

const controls = [
  ["Authentication & MFA", "Required before production artist access"],
  ["Tenant isolation", "Enforced at application and database layers"],
  ["Artist vault isolation", "Artist-specific permissions and asset boundaries"],
  ["Private storage", "No public buckets or permanent public asset URLs"],
  ["Audit logging", "Login, access, processing, export, and permission events"],
  ["Model protection", "Models invoked as a service rather than directly downloaded"],
];

export function SecurityAuditPage() {
  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Zero-trust foundation</span>
          <h2>Security & Audit</h2>
          <p>Security controls are implemented before valuable artist assets are admitted to the platform.</p>
        </div>
      </div>
      <div className="security-grid">
        {controls.map(([title, detail], index) => {
          const Icon = index % 3 === 0 ? KeyRound : index % 3 === 1 ? LockKeyhole : ShieldCheck;
          return <article className="security-card" key={title}><Icon size={20} /><div><strong>{title}</strong><p>{detail}</p></div></article>;
        })}
      </div>
    </div>
  );
}
