import { useEffect, useState } from "react";
import { LockKeyhole, Plus, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Artist={id:string;stage_name:string;legal_name:string|null;status:string;created_at:string};

export function ArtistsPage() {
  const [artists,setArtists]=useState<Artist[]>([]);
  const [message,setMessage]=useState("");
  useEffect(()=>{
    if(!supabase)return;
    supabase.from("artists").select("id,stage_name,legal_name,status,created_at").order("created_at",{ascending:false})
      .then(({data,error})=>{if(error)setMessage(error.message);else setArtists(data??[]);});
  },[]);
  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Artist Digital Vaults</span>
          <h2>Artists</h2>
          <p>Each artist receives an isolated vault with its own permissions, authorization, recordings, and model metadata.</p>
        </div>
        <Link className="primary-button link-button" to="/artist-enrollment"><Plus size={17} /> Enroll Artist</Link>
      </div>
      {message&&<div className="form-message">{message}</div>}
      {artists.length===0 ? <div className="empty-state">
        <div className="empty-icon"><LockKeyhole size={28} /></div>
        <h3>No artist vaults yet</h3>
        <p>Create an organization, then enroll the first artist.</p>
        <div className="inline-security"><ShieldCheck size={16} /> Artist data is isolated by tenant and artist membership.</div>
      </div> : <div className="security-grid">{artists.map(a=><article className="security-card" key={a.id}><LockKeyhole size={20}/><div><strong>{a.stage_name}</strong><p>{a.legal_name ? "Legal name: " + a.legal_name + " • " : ""}Status: {a.status}</p></div></article>)}</div>}
    </div>
  );
}
