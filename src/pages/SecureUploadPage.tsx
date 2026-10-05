import { FormEvent, useEffect, useState } from "react";
import { FileAudio, UploadCloud } from "lucide-react";
import { supabase } from "../lib/supabase";

type Artist={id:string;stage_name:string};

function safeName(name:string){return name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,120);}

export function SecureUploadPage(){
  const [artists,setArtists]=useState<Artist[]>([]);
  const [artistId,setArtistId]=useState("");
  const [title,setTitle]=useState("");
  const [year,setYear]=useState("");
  const [era,setEra]=useState("");
  const [kind,setKind]=useState<"historical"|"current"|"studio"|"live">("historical");
  const [training,setTraining]=useState(false);
  const [file,setFile]=useState<File|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{if(!supabase)return;supabase.from("artists").select("id,stage_name").order("stage_name").then(({data})=>{setArtists(data??[]);if(data?.[0])setArtistId(data[0].id);});},[]);

  async function submit(e:FormEvent){
    e.preventDefault();setMessage("");
    if(!supabase||!file||!artistId)return;
    if(!file.type.startsWith("audio/"))return setMessage("Only supported audio files may be uploaded.");
    setBusy(true);
    const assetId=crypto.randomUUID();
    const path=`${artistId}/${assetId}/${safeName(file.name)}`;
    const signed=await supabase.storage.from("artist-audio").createSignedUploadUrl(path);
    if(signed.error){setBusy(false);return setMessage(signed.error.message);}
    const uploaded=await supabase.storage.from("artist-audio").uploadToSignedUrl(path,signed.data.token,file,{contentType:file.type});
    if(uploaded.error){setBusy(false);return setMessage(uploaded.error.message);}
    const {data:{user}}=await supabase.auth.getUser();
    const meta=await supabase.from("recordings").insert({
      artist_id:artistId,title,recording_year:year?Number(year):null,era:era||null,
      recording_type:kind,training_eligible:training,storage_path:path,created_by:user!.id
    });
    setBusy(false);
    if(meta.error)setMessage("File is private, but metadata failed: "+meta.error.message);
    else {setMessage("Recording uploaded securely to the private artist vault.");setTitle("");setYear("");setEra("");setFile(null);setTraining(false);}
  }

  return <div className="stack">
    <div className="page-heading"><div><span className="eyebrow">Private artist vault</span><h2>Secure Audio Upload</h2><p>Files are uploaded to a private bucket using a short-lived signed upload token. Public URLs are not created.</p></div></div>
    <section className="panel"><form className="form-grid" onSubmit={submit}>
      <label>Artist<select required value={artistId} onChange={e=>setArtistId(e.target.value)}><option value="">Select</option>{artists.map(a=><option key={a.id} value={a.id}>{a.stage_name}</option>)}</select></label>
      <label>Recording title<input required value={title} onChange={e=>setTitle(e.target.value)}/></label>
      <label>Recording year<input type="number" min="1900" max="2100" value={year} onChange={e=>setYear(e.target.value)}/></label>
      <label>Era<input value={era} onChange={e=>setEra(e.target.value)} placeholder="e.g. 1988–1992"/></label>
      <label>Recording type<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="historical">Historical</option><option value="current">Current</option><option value="studio">Studio</option><option value="live">Live</option></select></label>
      <label>Audio file<input type="file" accept="audio/*,.wav,.flac,.mp3,.m4a,.aac,.ogg" required onChange={e=>setFile(e.target.files?.[0]??null)}/></label>
      <label className="checkbox-label"><input type="checkbox" checked={training} onChange={e=>setTraining(e.target.checked)}/> Mark training-eligible only if artist authorization covers model training.</label>
      <div className="form-actions"><button className="primary-button" disabled={busy}><UploadCloud size={17}/>{busy?"Uploading…":"Upload Securely"}</button></div>
    </form>{message&&<div className="form-message">{message}</div>}</section>
    <div className="inline-security"><FileAudio size={16}/> Audio objects remain private and artist-scoped.</div>
  </div>
}
