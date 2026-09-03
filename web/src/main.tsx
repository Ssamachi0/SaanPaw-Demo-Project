import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppStoreProvider } from '@saanpaw/shared';
import { AuthProvider, useAuth } from '@/auth';
import { Shell } from '@/components/Shell';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { ShelterApprovalsPage } from '@/pages/ShelterApprovals';
import { ReportMonitoringPage } from '@/pages/ReportMonitoring';
import { SystemManagementPage } from '@/pages/SystemManagement';
import { applyTokens } from '@/tokens';
import './styles.css';

applyTokens();

function Console() {
  const { signedIn } = useAuth();
  if (!signedIn) return <LoginPage />;

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/shelters" element={<ShelterApprovalsPage />} />
        <Route path="/reports" element={<ReportMonitoringPage />} />
        <Route path="/system" element={<SystemManagementPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStoreProvider>
      <AuthProvider>
        {/* GitHub Pages is static hosting with no server-side rewrite, so a
            refresh on e.g. /reports would 404 with BrowserRouter. HashRouter
            keeps every route after a "#", which the server never sees. */}
        <HashRouter>
          <Console />
        </HashRouter>
      </AuthProvider>
    </AppStoreProvider>
  </StrictMode>,
);
