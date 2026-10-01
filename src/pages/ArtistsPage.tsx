import { LockKeyhole, Plus, ShieldCheck } from "lucide-react";

export function ArtistsPage() {
  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Artist Digital Vaults</span>
          <h2>Artists</h2>
          <p>Each artist receives an isolated vault with its own permissions, authorization, recordings, and models.</p>
        </div>
        <button className="primary-button" disabled><Plus size={17} /> Enroll Artist</button>
      </div>
      <div className="empty-state">
        <div className="empty-icon"><LockKeyhole size={28} /></div>
        <h3>No artist vaults yet</h3>
        <p>Artist enrollment will unlock after authentication, authorization records, and tenant isolation are configured.</p>
        <div className="inline-security"><ShieldCheck size={16} /> Real artist assets should not be uploaded yet.</div>
      </div>
    </div>
  );
}
