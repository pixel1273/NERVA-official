/**
 * API helper for connecting the frontend to the NERVA backend.
 * Dynamically uses the current host's IP so it works on local WiFi networks.
 */
const API_BASE = `http://${window.location.hostname}:8000`;

function getToken() {
  return localStorage.getItem('nerva-token');
}

async function request(path, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

// Dashboard
export const fetchDashboardStats = () => request('/api/dashboard/stats');

// Incidents
export const fetchIncidents = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/incidents${query ? '?' + query : ''}`);
};
export const fetchIncident = (id) => request(`/api/incidents/${id}`);
export const createIncident = (data) => request('/api/incidents', { method: 'POST', body: JSON.stringify(data) });
export const createIncidentWithAI = (data) => request('/api/incidents/ai', { method: 'POST', body: JSON.stringify(data) });
export const updateIncident = (id, data) => request(`/api/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

// Routing
export const calculateRoute = (data) => request('/api/route', { method: 'POST', body: JSON.stringify(data) });
export const getAlternativeRoutes = (data) => request('/api/route/alternatives', { method: 'POST', body: JSON.stringify(data) });
export const fetchSegments = () => request('/api/route/segments');

// Fleet
export const fetchFleet = () => request('/api/fleet');
export const rerouteFleet = (data) => request('/api/fleet/reroute', { method: 'POST', body: JSON.stringify(data) });

// Alerts
export const fetchAlerts = () => request('/api/alerts');
export const createAlert = (data) => request('/api/alerts', { method: 'POST', body: JSON.stringify(data) });
export const createAlertWithTranslation = (data) => request('/api/alerts/translate', { method: 'POST', body: JSON.stringify(data) });

// Early Warning
export const runEarlyWarningScan = () => request('/api/early-warning/scan', { method: 'POST' });
export const generateEarlyWarningAlerts = () => request('/api/early-warning/generate-alerts', { method: 'POST' });
export const fetchLastScan = () => request('/api/early-warning/last-scan');

// AI/ML — Landslide Prediction
export const predictLandslide = (data) => request('/api/predict/landslide', { method: 'POST', body: JSON.stringify(data) });
export const fetchPredictionLocations = () => request('/api/predict/landslide/locations');

// AI/ML — Text Classification
export const classifyText = (data) => request('/api/classify/text', { method: 'POST', body: JSON.stringify(data) });

// AI/ML — Image Classification (uses FormData, not JSON)
export const classifyImage = async (file) => {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/classify/image`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
};

// AI/ML — Translation
export const translateText = (data) => request('/api/translate', { method: 'POST', body: JSON.stringify(data) });

// Analytics
export const fetchSeasonalAnalytics = () => request('/api/analytics/seasonal');
