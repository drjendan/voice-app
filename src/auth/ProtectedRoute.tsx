import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-screen"><div className="auth-card">Loading secure session…</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
