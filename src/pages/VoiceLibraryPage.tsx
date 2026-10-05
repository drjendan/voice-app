import { useEffect, useState } from "react";
import { AudioLines, ExternalLink, FileAudio, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Recording = {
  id:string;
  artist_id:string;
  title:string;
  recording_year:number|null;
  era:string|null;
  recording_type:string|null;
  training_eligible:boolean;
  storage_path:string;
};

export function VoiceLibraryPage() {
  const [recordings,setRecordings]=useState<Recording[]>([]);
  const [message,setMessage]=useState("");

  async function load(){
    if(!supabase)return;
    const {data,error}=await supabase.from("recordings")
      .select("id,artist_id,title,recording_year,era,recording_type,training_eligible,storage_path")
      .order("created_at",{ascending:false});
    if(error)setMessage(error.message); else setRecordings(data??[]);
  }
  useEffect(()=>{void load();},[]);

  async function openRecording(item:Recording){
    if(!supabase)return;
    setMessage("");
    const {data,error}=await supabase.storage.from("artist-audio").createSignedUrl(item.storage_path,60);
    if(error)return setMessage(error.message);
    window.open(data.signedUrl,"_blank","noopener,noreferrer");
  }

  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Authorized source material</span>
          <h2>Voice Library</h2>
          <p>Historical and current recordings remain private. Playback access is provided through short-lived signed URLs only.</p>
        </div>
        <Link className="primary-button link-button" to="/secure-upload"><UploadCloud size={17} /> Upload Recording</Link>
      </div>
      {message&&<div className="form-message">{message}</div>}
      {recordings.length===0 ? (
        <div className="empty-state">
          <div className="empty-icon"><AudioLines size={28} /></div>
          <h3>No recordings available</h3>
          <p>Use Secure Upload after an artist vault and appropriate authorization have been created.</p>
        </div>
      ) : (
        <div className="library-grid">
          {recordings.map(r=><article className="library-card" key={r.id}>
            <div className="library-icon"><FileAudio size={22}/></div>
            <div className="library-body"><strong>{r.title}</strong><span>{r.recording_type??"recording"}{r.recording_year ? " • " + r.recording_year : ""}{r.era ? " • " + r.era : ""}</span><small>{r.training_eligible?"Training eligible":"Not approved for training"}</small></div>
            <button className="icon-button" onClick={()=>void openRecording(r)} title="Open 60-second signed link"><ExternalLink size={16}/></button>
          </article>)}
        </div>
      )}
    </div>
  );
}
