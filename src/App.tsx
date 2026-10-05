import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./auth/ProtectedRoute";
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

function SecureApp() {
  return (
    <ProtectedRoute>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/organizations" element={<OrganizationSetupPage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/artist-enrollment" element={<ArtistEnrollmentPage />} />
          <Route path="/authorizations" element={<AuthorizationPage />} />
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
