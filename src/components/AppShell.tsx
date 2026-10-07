import type { ReactNode } from "react";
import { Activity, AudioLines, Building2, FileUp, KeyRound, LayoutDashboard, LogOut, Mic2, ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/organizations", label: "Organizations", icon: Building2 },
  { to: "/artists", label: "Artists", icon: Users },
  { to: "/artist-enrollment", label: "Enroll Artist", icon: UserPlus },
  { to: "/authorizations", label: "Authorizations", icon: UserCheck },
  { to: "/secure-upload", label: "Secure Upload", icon: FileUp },
  { to: "/voice-library", label: "Voice Library", icon: AudioLines },
  { to: "/restoration-studio", label: "Restoration Studio", icon: Activity },
  { to: "/live-performance", label: "Live Performance", icon: Mic2 },
  { to: "/security-setup", label: "Security Setup", icon: KeyRound },
  { to: "/security-audit", label: "Security & Audit", icon: ShieldCheck },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, aal, signOut } = useAuth();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="/evolve-ai-vocal-logo.webp" alt="Evolve AI Vocal" />
          <div>
            <div className="brand-name">Evolve AI Vocal</div>
            <div className="brand-subtitle">Preserve • Enhance • Empower</div>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="security-badge">
            <ShieldCheck size={16} />
            <span>{aal === "aal2" ? "MFA session active" : "Artist Vault Protected"}</span>
          </div>
          <div className="account-block">
            <span title={user?.email}>{user?.email}</span>
            <button className="sidebar-action" onClick={()=>void signOut()}><LogOut size={15}/> Sign out</button>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Evolve AI Vocal</h1>
            <p>Authorized vocal preservation, restoration, and live performance.</p>
          </div>
          <div className="environment-pill">Milestone 2 • Voice Restoration POC</div>
        </header>
        <section className="page-content">{children}</section>
      </main>
    </div>
  );
}
