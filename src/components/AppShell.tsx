import type { ReactNode } from "react";
import { Activity, AudioLines, LayoutDashboard, LockKeyhole, Mic2, ShieldCheck, Users } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/artists", label: "Artists", icon: Users },
  { to: "/voice-library", label: "Voice Library", icon: AudioLines },
  { to: "/restoration-studio", label: "Restoration Studio", icon: Activity },
  { to: "/live-performance", label: "Live Performance", icon: Mic2 },
  { to: "/security-audit", label: "Security & Audit", icon: ShieldCheck },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><LockKeyhole size={20} /></div>
          <div>
            <div className="brand-name">Vocal Legacy</div>
            <div className="brand-subtitle">Secure Voice Platform</div>
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
            <span>Artist Vault Protected</span>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Vocal Legacy Engine</h1>
            <p>Authorized vocal preservation, restoration, and live performance.</p>
          </div>
          <div className="environment-pill">Milestone 1</div>
        </header>
        <section className="page-content">{children}</section>
      </main>
    </div>
  );
}
