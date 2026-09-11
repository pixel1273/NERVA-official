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
import { Register } from './components/auth/Register';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { Unauthorized } from './components/auth/Unauthorized';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="report" element={<ReportIncident />} />
            <Route path="omniroute" element={<OmniRoutePage />} />
            <Route path="fleet" element={<FleetPage />} />
            <Route path="district" element={<DistrictPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="install" element={<InstallPage />} />
            <Route path="*" element={<div style={{padding: '2rem', color: 'var(--text-secondary)'}}>Page under construction...</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

