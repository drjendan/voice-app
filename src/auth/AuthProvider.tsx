import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { experienceForRoles, type Experience, type PlatformRole } from "./roles";

type Aal = "aal1" | "aal2" | null;

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  aal: Aal;
  roles: PlatformRole[];
  experience: Experience;
  refreshAal: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  hasAnyRole: (...allowed: PlatformRole[]) => boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeAal(value: string | null | undefined): Aal {
  return value === "aal2" ? "aal2" : value === "aal1" ? "aal1" : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [aal, setAal] = useState<Aal>(null);
  const [roles, setRoles] = useState<PlatformRole[]>([]);

  const refreshAal = async () => {
    if (!supabase) return setAal(null);
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setAal(normalizeAal(data?.currentLevel));
  };

  const refreshRoles = async () => {
    if (!supabase) return setRoles([]);
    const [{ data: orgRoles }, { data: artistRoles }] = await Promise.all([
      supabase.from("organization_memberships").select("role"),
      supabase.from("artist_memberships").select("role"),
    ]);
    const combined = [...(orgRoles ?? []), ...(artistRoles ?? [])]
      .map(row => row.role as PlatformRole);
    setRoles(Array.from(new Set(combined)));
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        await Promise.all([refreshAal(), refreshRoles()]);
      }
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        void refreshAal();
        void refreshRoles();
      } else {
        setAal(null);
        setRoles([]);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const experience = experienceForRoles(roles);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    aal,
    roles,
    experience,
    refreshAal,
    refreshRoles,
    hasAnyRole: (...allowed) => allowed.some(role => roles.includes(role)),
    signOut: async () => { if (supabase) await supabase.auth.signOut(); },
  }), [session, loading, aal, roles, experience]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
