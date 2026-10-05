import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";

export function SecuritySetupPage() {
  const { aal, refreshAal } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [factors, setFactors] = useState(0);

  async function loadFactors() {
    if (!supabase) return;
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp?.filter(f=>f.status==="verified").length ?? 0);
  }

  useEffect(()=>{ void loadFactors(); },[]);

  async function enroll() {
    if (!supabase) return;
    setMessage("");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType:"totp", friendlyName:"Evolve AI Vocal" });
    if (error) return setMessage(error.message);
    setFactorId(data.id);
    setQr(data.totp.qr_code);
  }

  async function verify() {
    if (!supabase || !factorId) return;
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) return setMessage(challenge.error.message);
    const result = await supabase.auth.mfa.verify({ factorId, challengeId:challenge.data.id, code });
    if (result.error) return setMessage(result.error.message);
    setMessage("MFA verified successfully.");
    setQr(null); setFactorId(null); setCode("");
    await loadFactors(); await refreshAal();
  }

  return (
    <div className="stack">
      <div className="page-heading"><div><span className="eyebrow">Account protection</span><h2>Security Setup</h2><p>Privileged users should use TOTP multi-factor authentication before handling artist assets.</p></div></div>
      <section className="panel">
        <div className="panel-heading"><h3>Multi-factor authentication</h3><span className={"status-pill " + (aal==="aal2" ? "status-secure":"status-progress")}>{aal==="aal2" ? "AAL2 active":"AAL1 session"}</span></div>
        <p className="muted">Verified authenticator factors: {factors}</p>
        {!qr && <button className="primary-button" onClick={enroll}><KeyRound size={17}/> Enroll authenticator</button>}
        {qr && <div className="mfa-enroll"><img src={qr} alt="Authenticator QR code"/><label>Verification code<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))}/></label><button className="primary-button" onClick={verify}><ShieldCheck size={17}/> Verify MFA</button></div>}
        {message && <div className="form-message">{message}</div>}
      </section>
    </div>
  );
}
