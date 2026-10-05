import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";

type Authorization = {
  id:string;
  artist_id:string;
  status:"draft"|"approved"|"expired"|"revoked";
  permitted_uses:string[];
  restrictions:string|null;
  effective_at:string|null;
  expires_at:string|null;
  artists?:{stage_name:string}|null;
};

export function AuthorizationPage(){
  const [items,setItems]=useState<Authorization[]>([]);
  const [selected,setSelected]=useState("");
  const [uses,setUses]=useState("studio_restoration,live_performance");
  const [restrictions,setRestrictions]=useState("");
  const [expires,setExpires]=useState("");
  const [message,setMessage]=useState("");

  async function load(){
    if(!supabase)return;
    const {data,error}=await supabase.from("artist_authorizations")
      .select("id,artist_id,status,permitted_uses,restrictions,effective_at,expires_at,artists(stage_name)")
      .order("created_at",{ascending:false});
    if(error)setMessage(error.message);
    else { const rows=(data??[]) as unknown as Authorization[]; setItems(rows); if(!selected&&rows[0])setSelected(rows[0].id); }
  }
  useEffect(()=>{void load();},[]);

  async function approve(e:FormEvent){
    e.preventDefault(); setMessage("");
    if(!supabase||!selected)return;
    const permitted=uses.split(",").map(v=>v.trim()).filter(Boolean);
    const {error}=await supabase.from("artist_authorizations").update({
      status:"approved",
      permitted_uses:permitted,
      restrictions:restrictions||null,
      effective_at:new Date().toISOString(),
      expires_at:expires?new Date(expires+"T23:59:59Z").toISOString():null,
    }).eq("id",selected);
    if(error)setMessage(error.message); else {setMessage("Authorization approved.");await load();}
  }

  async function revoke(id:string){
    if(!supabase)return;
    const {error}=await supabase.from("artist_authorizations").update({status:"revoked"}).eq("id",id);
    setMessage(error?error.message:"Authorization revoked. Processing is now blocked.");
    await load();
  }

  return <div className="stack">
    <div className="page-heading"><div><span className="eyebrow">Consent & model-use gate</span><h2>Artist Authorization</h2><p>AI processing is blocked until an artist authorization is explicitly approved. Revocation immediately invalidates future processing requests.</p></div></div>
    <section className="panel"><form className="form-grid" onSubmit={approve}>
      <label>Authorization<select value={selected} onChange={e=>setSelected(e.target.value)} required><option value="">Select</option>{items.map(a=><option key={a.id} value={a.id}>{a.artists?.stage_name??a.artist_id} — {a.status}</option>)}</select></label>
      <label>Permitted uses<input value={uses} onChange={e=>setUses(e.target.value)} /></label>
      <label>Restrictions<input value={restrictions} onChange={e=>setRestrictions(e.target.value)} placeholder="Optional limits or project restrictions"/></label>
      <label>Expiration date<input type="date" value={expires} onChange={e=>setExpires(e.target.value)}/></label>
      <div className="form-actions"><button className="primary-button"><CheckCircle2 size={17}/> Approve Authorization</button></div>
    </form>{message&&<div className="form-message">{message}</div>}</section>
    <div className="security-grid">{items.map(a=><article className="security-card" key={a.id}><ShieldCheck size={20}/><div><strong>{a.artists?.stage_name??"Artist"} — {a.status}</strong><p>Uses: {a.permitted_uses?.join(", ")||"None approved"}</p>{a.status==="approved"&&<button className="text-button danger-text" onClick={()=>void revoke(a.id)}>Revoke authorization</button>}</div></article>)}</div>
  </div>
}
