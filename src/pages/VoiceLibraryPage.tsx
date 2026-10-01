import { AudioLines, UploadCloud } from "lucide-react";

export function VoiceLibraryPage() {
  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Authorized source material</span>
          <h2>Voice Library</h2>
          <p>Historical and current recordings will be stored privately, tagged by era, and linked to documented usage rights.</p>
        </div>
        <button className="primary-button" disabled><UploadCloud size={17} /> Upload Recording</button>
      </div>
      <div className="empty-state">
        <div className="empty-icon"><AudioLines size={28} /></div>
        <h3>No recordings available</h3>
        <p>Uploads stay disabled until private storage and signed access have been verified.</p>
      </div>
    </div>
  );
}
