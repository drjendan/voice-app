import { FormEvent, useEffect, useState } from "react";
import { Plus, UserRound } from "lucide-react";
import { supabase } from "../lib/supabase";

type Org={id:string;name:string};
type Artist={id:string;stage_name:string;status:string};

export function ArtistEnrollmentPage(){
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [artists,setArtists]=useState<Artist[]>([]);
  const [orgId,setOrgId]=useState("");
  const [stageName,setStageName]=useState("");
  const [legalName,setLegalName]=useState("");
  const [message,setMessage]=useState("");

  async function load(){
    if(!supabase)return;
    const [{data:o},{data:a}] = await Promise.all([
      supabase.from("organizations").select("id,name").order("created_at"),
      supabase.from("artists").select("id,stage_name,status").order("created_at",{ascending:false})
    ]);
    setOrgs(o??[]); setArtists(a??[]);
    if(!orgId && o?.[0]) setOrgId(o[0].id);
  }
  useEffect(()=>{void load();},[]);

  async function submit(e:FormEvent){
    e.preventDefault(); setMessage("");
    if(!supabase||!orgId)return;
    const {error}=await supabase.rpc("enroll_artist",{target_org:orgId,artist_stage_name:stageName,artist_legal_name:legalName||null});
    if(error)setMessage(error.message); else {setStageName("");setLegalName("");setMessage("Artist vault created with draft authorization.");await load();}
  }

  return <div className="stack">
    <div className="page-heading"><div><span className="eyebrow">Secure enrollment</span><h2>Artist Enrollment</h2><p>Creates an isolated artist vault and draft authorization record. No model use is permitted until authorization is approved.</p></div></div>
    <section className="panel"><form className="form-grid" onSubmit={submit}>
      <label>Organization<select required value={orgId} onChange={e=>setOrgId(e.target.value)}><option value="">Select</option>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      <label>Stage / artist name<input required minLength={2} value={stageName} onChange={e=>setStageName(e.target.value)}/></label>
      <label>Legal name (optional)<input value={legalName} onChange={e=>setLegalName(e.target.value)}/></label>
      <div className="form-actions"><button className="primary-button"><Plus size={17}/> Create Artist Vault</button></div>
    </form>{message&&<div className="form-message">{message}</div>}</section>
    <div className="security-grid">{artists.map(a=><article className="security-card" key={a.id}><UserRound size={20}/><div><strong>{a.stage_name}</strong><p>Status: {a.status}</p></div></article>)}</div>
  </div>
}
