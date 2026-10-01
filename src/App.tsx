import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { ArtistsPage } from "./pages/ArtistsPage";
import { VoiceLibraryPage } from "./pages/VoiceLibraryPage";
import { RestorationStudioPage } from "./pages/RestorationStudioPage";
import { LivePerformancePage } from "./pages/LivePerformancePage";
import { SecurityAuditPage } from "./pages/SecurityAuditPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/artists" element={<ArtistsPage />} />
        <Route path="/voice-library" element={<VoiceLibraryPage />} />
        <Route path="/restoration-studio" element={<RestorationStudioPage />} />
        <Route path="/live-performance" element={<LivePerformancePage />} />
        <Route path="/security-audit" element={<SecurityAuditPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
