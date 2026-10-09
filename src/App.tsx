import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { useAuth } from "./auth/AuthProvider";
import type { Experience } from "./auth/roles";
import { DashboardPage } from "./pages/DashboardPage";
import { ArtistsPage } from "./pages/ArtistsPage";
import { VoiceLibraryPage } from "./pages/VoiceLibraryPage";
import { RestorationStudioPage } from "./pages/RestorationStudioPage";
import { LivePerformancePage } from "./pages/LivePerformancePage";
import { SecurityAuditPage } from "./pages/SecurityAuditPage";
import { LoginPage } from "./pages/LoginPage";
import { SecuritySetupPage } from "./pages/SecuritySetupPage";
import { OrganizationSetupPage } from "./pages/OrganizationSetupPage";
import { ArtistEnrollmentPage } from "./pages/ArtistEnrollmentPage";
import { AuthorizationPage } from "./pages/AuthorizationPage";
import { SecureUploadPage } from "./pages/SecureUploadPage";

function ExperienceRoute({ allowed, children }: { allowed: Experience[]; children: ReactNode }) {
  const { experience } = useAuth();
  return allowed.includes(experience) ? <>{children}</> : <Navigate to="/" replace />;
}

function SecureApp() {
  return (
    <ProtectedRoute>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/organizations" element={<ExperienceRoute allowed={["platform_admin"]}><OrganizationSetupPage /></ExperienceRoute>} />
          <Route path="/artists" element={<ExperienceRoute allowed={["platform_admin","artist_manager","engineer"]}><ArtistsPage /></ExperienceRoute>} />
          <Route path="/artist-enrollment" element={<ExperienceRoute allowed={["platform_admin"]}><ArtistEnrollmentPage /></ExperienceRoute>} />
          <Route path="/authorizations" element={<ExperienceRoute allowed={["platform_admin","artist_manager","artist"]}><AuthorizationPage /></ExperienceRoute>} />
          <Route path="/secure-upload" element={<SecureUploadPage />} />
          <Route path="/voice-library" element={<VoiceLibraryPage />} />
          <Route path="/restoration-studio" element={<RestorationStudioPage />} />
          <Route path="/live-performance" element={<LivePerformancePage />} />
          <Route path="/security-setup" element={<SecuritySetupPage />} />
          <Route path="/security-audit" element={<SecurityAuditPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="*" element={<SecureApp />} />
  </Routes>;
}
