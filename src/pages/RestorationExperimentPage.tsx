import { FormEvent, useEffect, useMemo, useState } from "react";
import { Beaker, CheckCircle2, FlaskConical, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Artist={id:string;stage_name:string};
type Recording={id:string;artist_id:string;title:string;recording_year:number|null;era:string|null;recording_type:string|null;training_eligible:boolean};
type Authorization={id:string;artist_id:string;status:string;effective_at:string|null;expires_at:string|null;permitted_uses:string[]};
type VoiceModel={id:string;artist_id:string;name:string;version:string;status:string};
type Experiment={id:string;name:string;status:string;restoration_strength:number;created_at:string;current_recording_id:string;historical_recording_id:string};

function isActiveAuthorization(a:Authorization){
  if(a.status!=="approved")return false;
  const now=Date.now();
  return (!a.effective_at||new Date(a.effective_at).getTime()<=now)&&(!a.expires_at||new Date(a.expires_at).getTime()>now);
}

export function RestorationExperimentPage(){
  const [artists,setArtists]=useState<Artist[]>([]);
  const [artistId,setArtistId]=useState("");
  const [recordings,setRecordings]=useState<Recording[]>([]);
  const [authorizations,setAuthorizations]=useState<Authorization[]>([]);
  const [models,setModels]=useState<VoiceModel[]>([]);
  const [experiments,setExperiments]=useState<Experiment[]>([]);
  const [name,setName]=useState("");
  const [currentId,setCurrentId]=useState("");
  const [historicalId,setHistoricalId]=useState("");
  const [modelId,setModelId]=useState("");
  const [strength,setStrength]=useState(55);
  const [notes,setNotes]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    if(!supabase)return;
    supabase.from("artists").select("id,stage_name").order("stage_name").then(({data,error})=>{
      if(error)setMessage(error.message);
      const rows=data??[];
      setArtists(rows);
      if(rows[0])setArtistId(rows[0].id);
    });
  },[]);

  useEffect(()=>{
    if(!supabase||!artistId)return;
    Promise.all([
      supabase.from("recordings").select("id,artist_id,title,recording_year,era,recording_type,training_eligible").eq("artist_id",artistId).order("created_at",{ascending:false}),
      supabase.from("artist_authorizations").select("id,artist_id,status,effective_at,expires_at,permitted_uses").eq("artist_id",artistId).order("created_at",{ascending:false}),
      supabase.from("voice_models").select("id,artist_id,name,version,status").eq("artist_id",artistId).order("created_at",{ascending:false}),
      supabase.from("restoration_experiments").select("id,name,status,restoration_strength,created_at,current_recording_id,historical_recording_id").eq("artist_id",artistId).order("created_at",{ascending:false})
    ]).then(([r,a,v,e])=>{
      const error=r.error||a.error||v.error||e.error;
      if(error)setMessage(error.message);
      setRecordings(r.data??[]);
      setAuthorizations(a.data??[]);
      setModels(v.data??[]);
      setExperiments(e.data??[]);
      const currents=(r.data??[]).filter(x=>x.recording_type==="current");
      const historical=(r.data??[]).filter(x=>x.recording_type==="historical");
      setCurrentId(currents[0]?.id??"");
      setHistoricalId(historical[0]?.id??"");
      setModelId((v.data??[]).find(x=>x.status==="active")?.id??"");
    });
  },[artistId]);

  const activeAuthorization=authorizations.find(isActiveAuthorization);
  const currentRecordings=recordings.filter(r=>r.recording_type==="current");
  const historicalRecordings=recordings.filter(r=>r.recording_type==="historical");
  const selectedHistorical=recordings.find(r=>r.id===historicalId);
  const selectedCurrent=recordings.find(r=>r.id===currentId);

  const readiness=useMemo(()=>[
    {label:"Current recording selected",ok:Boolean(currentId)},
    {label:"Historical reference selected",ok:Boolean(historicalId)},
    {label:"Active authorization",ok:Boolean(activeAuthorization)},
    {label:"Model selected (optional for DSP baseline)",ok:Boolean(modelId),optional:true}
  ],[currentId,historicalId,activeAuthorization,modelId]);

  const ready=Boolean(currentId&&historicalId&&activeAuthorization);

  async function createExperiment(e:FormEvent){
    e.preventDefault();
    if(!supabase||!artistId||!activeAuthorization||!currentId||!historicalId)return;
    setBusy(true);setMessage("");
    const {data:{user}}=await supabase.auth.getUser();
    const payload={
      artist_id:artistId,
      created_by:user!.id,
      name:name.trim()||`Restoration Experiment ${new Date().toLocaleDateString()}`,
      current_recording_id:currentId,
      historical_recording_id:historicalId,
      authorization_id:activeAuthorization.id,
      model_id:modelId||null,
      restoration_strength:strength,
      status:"ready",
      notes:notes.trim()||null
    };
    const result=await supabase.from("restoration_experiments").insert(payload).select("id,name,status,restoration_strength,created_at,current_recording_id,historical_recording_id").single();
    setBusy(false);
    if(result.error)return setMessage(result.error.message);
    setExperiments(prev=>[result.data,...prev]);
    setName("");setNotes("");
    setMessage("Experiment created. The historical reference is now attached to the workflow. DSP processing still uses the current recording only until model-conditioned restoration is implemented.");
  }

  return <div className="stack">
    <div className="page-heading">
      <div>
        <span className="eyebrow">Milestone 2 • Restoration Experiment</span>
        <h2>Restoration Experiment</h2>
        <p>Pair a current vocal with an authorized historical reference, choose an approved model when available, and create a traceable restoration experiment.</p>
      </div>
      <Link className="secondary-button link-button" to="/restoration-studio"><FlaskConical size={17}/> Open Studio</Link>
    </div>

    <section className="panel experiment-hero">
      <div className="experiment-hero-copy">
        <div className="profile-avatar"><Beaker size={25}/></div>
        <div><strong>Experiment Builder</strong><span>Historical target + current input + authorization + restoration controls</span></div>
      </div>
      <span className={ready?"status-pill status-secure":"status-pill status-progress"}>{ready?"Ready to create":"Setup incomplete"}</span>
    </section>

    <div className="two-column">
      <section className="panel">
        <div className="panel-heading"><div><h3>1. Experiment Setup</h3><p className="muted">All selectors are limited by the signed-in user's Supabase permissions.</p></div><Sparkles size={21}/></div>
        <form className="experiment-form" onSubmit={createExperiment}>
          <label>Artist<select value={artistId} onChange={e=>setArtistId(e.target.value)}>{artists.map(a=><option key={a.id} value={a.id}>{a.stage_name}</option>)}</select></label>
          <label>Experiment name<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. 1990s tone restoration baseline"/></label>
          <label>Current vocal<select value={currentId} onChange={e=>setCurrentId(e.target.value)}><option value="">Select current recording</option>{currentRecordings.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
          <label>Historical reference<select value={historicalId} onChange={e=>setHistoricalId(e.target.value)}><option value="">Select historical reference</option>{historicalRecordings.map(r=><option key={r.id} value={r.id}>{r.title}{r.era?" • "+r.era:""}{r.recording_year?" • "+r.recording_year:""}</option>)}</select></label>
          <label>Voice model<select value={modelId} onChange={e=>setModelId(e.target.value)}><option value="">DSP baseline — no model</option>{models.map(v=><option key={v.id} value={v.id}>{v.name} v{v.version} • {v.status}</option>)}</select></label>
          <label className="range-control restoration-strength"><span>Restoration strength: {strength}%</span><input type="range" min="0" max="100" value={strength} onChange={e=>setStrength(Number(e.target.value))}/></label>
          <label>Experiment notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What are we testing or listening for?"/></label>
          <button className="primary-button" disabled={!ready||busy}><Beaker size={17}/>{busy?"Creating…":"Create Experiment"}</button>
        </form>
        {message&&<div className="form-message">{message}</div>}
      </section>

      <section className="panel">
        <div className="panel-heading"><div><h3>2. Readiness Gate</h3><p className="muted">We block experiment creation until the minimum authorized workflow is present.</p></div>{ready?<ShieldCheck size={21}/>:<ShieldAlert size={21}/>}</div>
        <div className="readiness-list">{readiness.map(item=><div className="readiness-row" key={item.label}>
          {item.ok?<CheckCircle2 className="ready-icon" size={18}/>:<ShieldAlert className="blocked-icon" size={18}/>}
          <div><strong>{item.label}</strong>{item.optional&&<span>Optional during DSP baseline</span>}</div>
        </div>)}</div>

        <div className="experiment-summary">
          <div><span>Current input</span><strong>{selectedCurrent?.title||"Not selected"}</strong></div>
          <div><span>Historical target</span><strong>{selectedHistorical?.title||"Not selected"}</strong></div>
          <div><span>Target era</span><strong>{selectedHistorical?.era||selectedHistorical?.recording_year||"Not assigned"}</strong></div>
          <div><span>Authorization</span><strong>{activeAuthorization?"Approved & active":"Not active"}</strong></div>
        </div>

        <div className="profile-warning">Milestone 2 note: selecting a historical recording defines the experiment target and audit trail. The current DSP POC does not yet transform audio using that historical reference. Model-conditioned restoration is the next engine phase.</div>
      </section>
    </div>

    <section className="panel">
      <div className="panel-heading"><div><h3>3. Experiment History</h3><p className="muted">Saved experiments remain artist-scoped and auditable.</p></div><Beaker size={21}/></div>
      {experiments.length===0?<div className="profile-empty">No restoration experiments have been created for this artist yet.</div>:
        <div className="experiment-list">{experiments.map(x=><article className="experiment-row" key={x.id}><div><strong>{x.name}</strong><span>{new Date(x.created_at).toLocaleString()} • Strength {x.restoration_strength}%</span></div><span className={x.status==="completed"?"status-pill status-secure":"status-pill"}>{x.status}</span></article>)}</div>}
    </section>
  </div>;
}
