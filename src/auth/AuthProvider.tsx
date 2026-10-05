import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Aal = "aal1" | "aal2" | null;

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  aal: Aal;
  refreshAal: () => Promise<void>;
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

  const refreshAal = async () => {
    if (!supabase) return setAal(null);
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setAal(normalizeAal(data?.currentLevel));
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) void refreshAal();
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) void refreshAal();
      else setAal(null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    aal,
    refreshAal,
    signOut: async () => { if (supabase) await supabase.auth.signOut(); },
  }), [session, loading, aal]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
