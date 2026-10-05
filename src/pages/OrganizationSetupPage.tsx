import { FormEvent, useEffect, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";

type Org = { id:string; name:string };

export function OrganizationSetupPage() {
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [name,setName]=useState("");
  const [message,setMessage]=useState("");

  async function load() {
    if (!supabase) return;
    const { data,error } = await supabase.from("organizations").select("id,name").order("created_at");
    if (error) setMessage(error.message); else setOrgs(data ?? []);
  }
  useEffect(()=>{ void load(); },[]);

  async function create(e:FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.rpc("create_organization",{org_name:name});
    if (error) setMessage(error.message); else { setName(""); setMessage("Organization created."); await load(); }
  }

  return <div className="stack">
    <div className="page-heading"><div><span className="eyebrow">Tenant setup</span><h2>Organizations</h2><p>Organizations form the first isolation boundary for artist data.</p></div></div>
    <section className="panel">
      <form className="inline-form" onSubmit={create}><label>Organization name<input required minLength={2} value={name} onChange={e=>setName(e.target.value)} placeholder="Evolve Entertainment"/></label><button className="primary-button"><Plus size={17}/> Create</button></form>
      {message && <div className="form-message">{message}</div>}
    </section>
    <div className="security-grid">{orgs.map(o=><article className="security-card" key={o.id}><Building2 size={20}/><div><strong>{o.name}</strong><p>{o.id}</p></div></article>)}</div>
  </div>
}
