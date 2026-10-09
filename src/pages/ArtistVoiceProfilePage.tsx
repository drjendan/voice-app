import { useEffect, useMemo, useState } from "react";
import { AudioLines, FileAudio, Library, LockKeyhole, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Artist = { id:string; stage_name:string; legal_name:string|null; status:string };
type Recording = {
  id:string;
  artist_id:string;
  title:string;
  recording_year:number|null;
  era:string|null;
  recording_type:string|null;
  training_eligible:boolean;
  created_at:string;
};
type Authorization = {
  id:string;
  artist_id:string;
  status:"draft"|"approved"|"expired"|"revoked";
  permitted_uses:string[];
  restrictions:string|null;
  effective_at:string|null;
  expires_at:string|null;
};
type VoiceModel = {
  id:string;
  artist_id:string;
  name:string;
  version:string;
  status:string;
  authorization_id:string;
  created_at:string;
};

function eraLabel(recording:Recording){
  return recording.era || (recording.recording_year ? String(recording.recording_year) : "Unassigned era");
}

export function ArtistVoiceProfilePage(){
  const [artists,setArtists]=useState<Artist[]>([]);
  const [artistId,setArtistId]=useState("");
  const [recordings,setRecordings]=useState<Recording[]>([]);
  const [authorizations,setAuthorizations]=useState<Authorization[]>([]);
  const [models,setModels]=useState<VoiceModel[]>([]);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    if(!supabase){setLoading(false);return;}
    supabase.from("artists")
      .select("id,stage_name,legal_name,status")
      .order("stage_name")
      .then(({data,error})=>{
        if(error)setMessage(error.message);
        const rows=data??[];
        setArtists(rows);
        if(rows[0])setArtistId(rows[0].id);
        setLoading(false);
      });
  },[]);

  useEffect(()=>{
    if(!supabase||!artistId){
      setRecordings([]);setAuthorizations([]);setModels([]);return;
    }
    setMessage("");
    Promise.all([
      supabase.from("recordings").select("id,artist_id,title,recording_year,era,recording_type,training_eligible,created_at").eq("artist_id",artistId).order("recording_year",{ascending:true,nullsFirst:false}),
      supabase.from("artist_authorizations").select("id,artist_id,status,permitted_uses,restrictions,effective_at,expires_at").eq("artist_id",artistId).order("created_at",{ascending:false}),
      supabase.from("voice_models").select("id,artist_id,name,version,status,authorization_id,created_at").eq("artist_id",artistId).order("created_at",{ascending:false})
    ]).then(([recordingResult,authorizationResult,modelResult])=>{
      const error=recordingResult.error||authorizationResult.error||modelResult.error;
      if(error)setMessage(error.message);
      setRecordings(recordingResult.data??[]);
      setAuthorizations(authorizationResult.data??[]);
      setModels(modelResult.data??[]);
    });
  },[artistId]);

  const artist=artists.find(a=>a.id===artistId);
  const activeAuthorization=authorizations.find(a=>{
    if(a.status!=="approved")return false;
    const now=Date.now();
    const effective=!a.effective_at||new Date(a.effective_at).getTime()<=now;
    const unexpired=!a.expires_at||new Date(a.expires_at).getTime()>now;
    return effective&&unexpired;
  });

  const historical=recordings.filter(r=>r.recording_type==="historical");
  const current=recordings.filter(r=>r.recording_type==="current");
  const trainingEligible=recordings.filter(r=>r.training_eligible);
  const eras=useMemo(()=>{
    const grouped=new Map<string,Recording[]>();
    for(const recording of recordings){
      const key=eraLabel(recording);
      grouped.set(key,[...(grouped.get(key)??[]),recording]);
    }
    return Array.from(grouped.entries());
  },[recordings]);

  if(loading)return <div className="panel">Loading artist voice profiles…</div>;

  return <div className="stack">
    <div className="page-heading">
      <div>
        <span className="eyebrow">Milestone 2 • Artist Voice Intelligence</span>
        <h2>Artist Voice Profile</h2>
        <p>Organize authorized historical and current recordings by artist and era, review training eligibility, and track the approved voice models that will drive restoration experiments.</p>
      </div>
      <Link className="primary-button link-button" to="/secure-upload"><UploadCloud size={17}/> Add Recording</Link>
    </div>

    {artists.length===0 ? <div className="empty-state">
      <div className="empty-icon"><LockKeyhole size={28}/></div>
      <h3>No artist profile is available</h3>
      <p>An artist vault and membership must exist before a voice profile can be built.</p>
    </div> : <>
      <section className="panel voice-profile-selector">
        <label>
          <span>Artist</span>
          <select value={artistId} onChange={e=>setArtistId(e.target.value)}>
            {artists.map(a=><option key={a.id} value={a.id}>{a.stage_name}</option>)}
          </select>
        </label>
        <div className="profile-identity">
          <div className="profile-avatar"><AudioLines size={26}/></div>
          <div><strong>{artist?.stage_name}</strong><span>{artist?.status||"active"} artist vault</span></div>
        </div>
        <span className={activeAuthorization ? "status-pill status-secure" : "status-pill status-progress"}>
          {activeAuthorization ? "Active authorization" : "Authorization required"}
        </span>
      </section>

      {message&&<div className="form-message">{message}</div>}

      <div className="profile-metric-grid">
        <article className="metric-card"><Library size={18}/><div className="metric-value">{recordings.length}</div><div className="metric-label">Voice recordings</div><div className="metric-detail">Visible under current RLS permissions</div></article>
        <article className="metric-card"><FileAudio size={18}/><div className="metric-value">{historical.length}</div><div className="metric-label">Historical sources</div><div className="metric-detail">Potential restoration reference material</div></article>
        <article className="metric-card"><AudioLines size={18}/><div className="metric-value">{current.length}</div><div className="metric-label">Current recordings</div><div className="metric-detail">Candidate restoration inputs</div></article>
        <article className="metric-card"><Sparkles size={18}/><div className="metric-value">{trainingEligible.length}</div><div className="metric-label">Training eligible</div><div className="metric-detail">Only when authorization permits model training</div></article>
      </div>

      <div className="two-column">
        <section className="panel">
          <div className="panel-heading"><div><h3>Authorization Gate</h3><p className="muted">Restoration and model work must remain within the artist's approved use.</p></div><ShieldCheck size={21}/></div>
          {activeAuthorization ? <div className="authorization-summary">
            <div><span>Status</span><strong>Approved & active</strong></div>
            <div><span>Permitted uses</span><strong>{activeAuthorization.permitted_uses.length ? activeAuthorization.permitted_uses.join(", ") : "No uses listed"}</strong></div>
            <div><span>Expires</span><strong>{activeAuthorization.expires_at ? new Date(activeAuthorization.expires_at).toLocaleDateString() : "No expiration set"}</strong></div>
            {activeAuthorization.restrictions&&<div><span>Restrictions</span><strong>{activeAuthorization.restrictions}</strong></div>}
          </div> : <div className="profile-warning">No active approved authorization was found. Keep real artist processing blocked until authorization is active.</div>}
        </section>

        <section className="panel">
          <div className="panel-heading"><div><h3>Voice Models</h3><p className="muted">Approved model metadata associated with this artist.</p></div><Sparkles size={21}/></div>
          {models.length===0 ? <div className="profile-empty">No voice models registered yet. This is expected before the first restoration experiment.</div> :
            <div className="model-list">{models.map(model=><div className="model-row" key={model.id}><div><strong>{model.name}</strong><span>Version {model.version}</span></div><span className={model.status==="active"?"status-pill status-secure":"status-pill"}>{model.status}</span></div>)}</div>}
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading"><div><h3>Recording Timeline by Era</h3><p className="muted">Use this view to curate the historical periods that should define an artist's restoration target.</p></div><Library size={21}/></div>
        {eras.length===0 ? <div className="profile-empty">No recordings are in this artist's voice library yet.</div> :
          <div className="era-list">{eras.map(([era,items])=><div className="era-group" key={era}>
            <div className="era-heading"><strong>{era}</strong><span>{items.length} recording{items.length===1?"":"s"}</span></div>
            <div className="era-recordings">{items.map(item=><article className="era-recording" key={item.id}>
              <div><strong>{item.title}</strong><span>{item.recording_year||"Year unknown"} • {item.recording_type||"recording"}</span></div>
              <span className={item.training_eligible?"status-pill status-secure":"status-pill status-progress"}>{item.training_eligible?"Training eligible":"Reference only"}</span>
            </article>)}</div>
          </div>)}</div>}
      </section>

      <div className="inline-security"><ShieldCheck size={16}/> This profile only displays artists, recordings, authorizations, and models permitted by Supabase row-level security.</div>
    </>}
  </div>;
}
