import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";

export function LoginPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin"|"signup">("signin");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!supabase) return setMessage("Supabase is not configured.");
    setBusy(true);
    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup") setMessage("Account created. Check your email if confirmation is required.");
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo"><LockKeyhole size={24}/></div>
        <span className="eyebrow">Evolve AI Vocal</span>
        <h2>{mode === "signin" ? "Secure sign in" : "Create account"}</h2>
        <p>Authorized access only. Sensitive artist activity is audited.</p>
        <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <label>Password<input type="password" minLength={10} required value={password} onChange={e=>setPassword(e.target.value)} /></label>
        {message && <div className="form-message">{message}</div>}
        <button className="primary-button" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
        <button type="button" className="text-button" onClick={()=>setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Need an account?" : "Already have an account?"}
        </button>
      </form>
    </div>
  );
}
