import { useEffect, useState } from "react";
import { AudioLines, LockKeyhole, Mic2, ShieldCheck, Users } from "lucide-react";
import { supabase } from "../lib/supabase";

export function DashboardPage() {
  const [counts,setCounts]=useState({artists:0,assets:0,models:0,events:0});
  useEffect(()=>{if(!supabase)return;(async()=>{
    const [a,r,m,e]=await Promise.all([
      supabase.from("artists").select("id",{count:"exact",head:true}),
      supabase.from("recordings").select("id",{count:"exact",head:true}),
      supabase.from("voice_models").select("id",{count:"exact",head:true}),
      supabase.from("audit_events").select("id",{count:"exact",head:true}),
    ]);
    setCounts({artists:a.count??0,assets:r.count??0,models:m.count??0,events:e.count??0});
  })();},[]);

  const cards = [
    { label: "Artists", value: String(counts.artists), detail: "Accessible artist vaults", icon: Users },
    { label: "Protected Assets", value: String(counts.assets), detail: "Private recording metadata", icon: LockKeyhole },
    { label: "Voice Models", value: String(counts.models), detail: "Authorized model metadata", icon: AudioLines },
    { label: "Audit Events", value: String(counts.events), detail: "Visible security activity", icon: ShieldCheck },
  ];

  return (
    <div className="stack">
      <div className="hero-card">
        <div>
          <span className="eyebrow">Secure by design</span>
          <h2>Protect the artist. Preserve the voice.</h2>
          <p>Evolve AI Vocal keeps recordings, training material, authorization records, and voice models inside isolated artist vaults. Model use requires active authorization and sensitive actions are auditable.</p>
        </div>
        <div className="hero-icon"><Mic2 size={46} /></div>
      </div>
      <div className="metric-grid">{cards.map(({label,value,detail,icon:Icon})=><article className="metric-card" key={label}><div className="metric-icon"><Icon size={20}/></div><div className="metric-value">{value}</div><div className="metric-label">{label}</div><div className="metric-detail">{detail}</div></article>)}</div>
      <div className="two-column">
        <article className="panel"><div className="panel-heading"><h3>Milestone 1 controls</h3><span className="status-pill status-secure">Built</span></div><ul className="check-list"><li>Authentication and TOTP MFA enrollment</li><li>Tenant and artist row-level isolation</li><li>Role-based write controls</li><li>Private object storage and signed access</li><li>Consent and authorization gate</li><li>Immutable sensitive-action audit hooks</li><li>JWT validation at the audio API boundary</li></ul></article>
        <article className="panel"><div className="panel-heading"><h3>Production-data gate</h3><span className="status-pill status-progress">Verify environment</span></div><p className="muted">Before loading real artist material, apply all Supabase migrations and complete the deployment security checklist with disposable test tenants. Milestone 2 begins only after those controls pass.</p></article>
      </div>
    </div>
  );
}
