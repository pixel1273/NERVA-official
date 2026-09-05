import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './components/dashboard/Dashboard';
import { Incidents } from './components/incidents/Incidents';
import { ReportIncident } from './components/incidents/ReportIncident';
import { OmniRoutePage } from './components/omniroute/OmniRoute';
import { FleetPage } from './components/fleet/Fleet';
import { DistrictPage } from './components/district/District';
import { AnalyticsPage } from './components/analytics/Analytics';
import { InstallPage } from './components/install/InstallPage';
import { Login } from './components/auth/Login';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="report" element={<ProtectedRoute allowedRoles={['role_ground_staff', 'role_district_admin', 'role_central_command']}><ReportIncident /></ProtectedRoute>} />
            <Route path="omniroute" element={<OmniRoutePage />} />
            <Route path="fleet" element={<ProtectedRoute allowedRoles={['role_central_command']}><FleetPage /></ProtectedRoute>} />
            <Route path="district" element={<ProtectedRoute allowedRoles={['role_district_admin', 'role_central_command']}><DistrictPage /></ProtectedRoute>} />
            <Route path="analytics" element={<ProtectedRoute allowedRoles={['role_district_admin', 'role_central_command']}><AnalyticsPage /></ProtectedRoute>} />
            <Route path="install" element={<InstallPage />} />
            <Route path="*" element={<div style={{padding: '2rem', color: 'var(--text-secondary)'}}>Page under construction...</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

