import type { ReactNode } from "react";
import { Activity, AudioLines, Beaker, Building2, FileUp, KeyRound, LayoutDashboard, LogOut, Mic2, ShieldCheck, Sparkles, UserCheck, UserPlus, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { experienceLabel, type Experience } from "../auth/roles";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, experiences: ["platform_admin","artist_manager","engineer","artist"] },
  { to: "/organizations", label: "Organizations", icon: Building2, experiences: ["platform_admin"] },
  { to: "/artists", label: "Artists", icon: Users, experiences: ["platform_admin","artist_manager","engineer"] },
  { to: "/artist-enrollment", label: "Enroll Artist", icon: UserPlus, experiences: ["platform_admin"] },
  { to: "/authorizations", label: "Authorizations", icon: UserCheck, experiences: ["platform_admin","artist_manager","artist"] },
  { to: "/secure-upload", label: "Secure Upload", icon: FileUp, experiences: ["platform_admin","artist_manager","engineer","artist"] },
  { to: "/voice-library", label: "Voice Library", icon: AudioLines, experiences: ["platform_admin","artist_manager","engineer","artist"] },
  { to: "/voice-profiles", label: "Voice Profiles", icon: Sparkles, experiences: ["platform_admin","artist_manager","engineer","artist"] },
  { to: "/restoration-experiments", label: "Experiments", icon: Beaker, experiences: ["platform_admin","artist_manager","engineer","artist"] },
  { to: "/restoration-studio", label: "Restoration Studio", icon: Activity, experiences: ["platform_admin","artist_manager","engineer","artist"] },
  { to: "/live-performance", label: "Live Performance", icon: Mic2, experiences: ["platform_admin","artist_manager","engineer","artist"] },
  { to: "/security-setup", label: "Security Setup", icon: KeyRound, experiences: ["platform_admin","artist_manager","engineer","artist"] },
  { to: "/security-audit", label: "Security & Audit", icon: ShieldCheck, experiences: ["platform_admin","artist_manager","engineer","artist"] },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, aal, signOut, experience } = useAuth();
  const visibleNav = navItems.filter(item => item.experiences.includes(experience as never));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo-wrap"><img className="brand-logo" src="/evolve-ai-vocal-logo.webp" alt="Evolve AI Vocal" /></div>
          <div>
            <div className="brand-name">Evolve AI Vocal</div>
            <div className="brand-subtitle">Preserve • Enhance • Empower</div>
          </div>
        </div>
        <div className="experience-badge">{experienceLabel(experience as Experience)}</div>
        <nav className="nav-list">
          {visibleNav.map(({ to, label, icon: Icon }) => (
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
            <p>{experienceLabel(experience as Experience)} • Authorized vocal preservation, restoration, and live performance.</p>
          </div>
          <div className="environment-pill">Milestone 2 • Voice Restoration POC</div>
        </header>
        <section className="page-content">{children}</section>
      </main>
    </div>
  );
}
