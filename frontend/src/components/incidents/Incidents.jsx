import React, { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, Clock, Filter, ChevronDown } from 'lucide-react';
import { fetchIncidents, updateIncident } from '../../data/api';
import './Incidents.css';

const SEVERITY_COLORS = {
  critical: 'var(--risk-high)',
  high: '#FF6B35',
  medium: 'var(--risk-medium)',
  low: 'var(--risk-low)',
};

const TYPE_LABELS = {
  road_block: 'Road Block',
  landslide: 'Landslide',
  flood: 'Flood',
  bridge_issue: 'Bridge Issue',
  road_damage: 'Road Damage',
};

export function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ severity: '', status: '' });

  useEffect(() => {
    loadIncidents();
  }, [filter]);

  async function loadIncidents() {
    setLoading(true);
    try {
      const params = {};
      if (filter.severity) params.severity = filter.severity;
      if (filter.status) params.status = filter.status;
      const data = await fetchIncidents(params);
      setIncidents(data);
    } catch {
      // Fallback to mock data if backend is not running
      setIncidents(MOCK_INCIDENTS);
    }
    setLoading(false);
  }

  async function handleStatusChange(id, newStatus) {
    try {
      await updateIncident(id, { status: newStatus });
      loadIncidents();
    } catch { /* Backend offline */ }
  }

  return (
    <div className="incidents-page">
      <header className="page-header">
        <div>
          <h2 className="page-title">Field Reports</h2>
          <p className="page-subtitle">Live incident reports from Ground Staff across the NER</p>
        </div>
        <div className="status-legend-bar">
          <span><span className="dot" style={{ background: SEVERITY_COLORS.critical }}></span> Critical</span>
          <span><span className="dot" style={{ background: SEVERITY_COLORS.high }}></span> High</span>
          <span><span className="dot" style={{ background: SEVERITY_COLORS.medium }}></span> Warning</span>
          <span><span className="dot" style={{ background: SEVERITY_COLORS.low }}></span> Resolved</span>
        </div>
      </header>

      <div className="filter-bar glass-panel">
        <Filter size={16} />
        <select value={filter.severity} onChange={e => setFilter(f => ({...f, severity: e.target.value}))}>
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={filter.status} onChange={e => setFilter(f => ({...f, status: e.target.value}))}>
          <option value="">All Statuses</option>
          <option value="reported">Reported</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="incidents-grid">
        {incidents.map((inc) => (
          <div key={inc.id} className="incident-card glass-panel" style={{ borderLeft: `4px solid ${SEVERITY_COLORS[inc.severity] || '#666'}` }}>
            <div className="incident-card-header">
              <span className="severity-badge" style={{ background: SEVERITY_COLORS[inc.severity] }}>
                {inc.severity.toUpperCase()}
              </span>
              <span className="incident-type">{TYPE_LABELS[inc.type] || inc.type}</span>
            </div>
            <h3 className="incident-title">{inc.title}</h3>
            <p className="incident-desc">{inc.description}</p>
            <div className="incident-meta">
              <span><MapPin size={14} /> {inc.location_name || `${inc.latitude}, ${inc.longitude}`}</span>
              <span><AlertTriangle size={14} /> {inc.district}, {inc.state}</span>
              <span><Clock size={14} /> {inc.created_at}</span>
            </div>
            <div className="incident-actions">
              <span className={`status-tag status-${inc.status}`}>{inc.status.replace('_', ' ')}</span>
              {inc.status !== 'resolved' && (
                <select
                  className="status-select"
                  value={inc.status}
                  onChange={e => handleStatusChange(inc.id, e.target.value)}
                >
                  <option value="reported">Reported</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Fallback mock data if backend isn't running
const MOCK_INCIDENTS = [
  { id: 1, title: "NH-37 Partial Washout", description: "Heavy rainfall caused partial road washout near Kaziranga.", type: "road_damage", severity: "critical", status: "reported", latitude: 26.5775, longitude: 93.1711, location_name: "Near Kaziranga National Park", district: "Golaghat", state: "Assam", photo_url: null, reported_by: "field_staff", created_at: "2026-08-28 15:30", updated_at: "2026-08-28 15:30" },
  { id: 2, title: "Landslide on Kohima-Dimapur Road", description: "Debris blocking 60% of roadway.", type: "landslide", severity: "high", status: "acknowledged", latitude: 25.8006, longitude: 93.8832, location_name: "Kohima-Dimapur Highway", district: "Kohima", state: "Nagaland", photo_url: null, reported_by: "field_staff", created_at: "2026-08-28 14:45", updated_at: "2026-08-28 14:50" },
  { id: 3, title: "Bridge Cleared at Tezpur", description: "Kolia Bhomora Setu bridge reopened.", type: "bridge_issue", severity: "low", status: "resolved", latitude: 26.6338, longitude: 92.7897, location_name: "Tezpur", district: "Sonitpur", state: "Assam", photo_url: null, reported_by: "district_admin", created_at: "2026-08-28 12:00", updated_at: "2026-08-28 14:00" },
  { id: 4, title: "Flash Flood Warning - Barak Valley", description: "IMD flash flood warning for Barak river basin.", type: "flood", severity: "high", status: "reported", latitude: 24.8333, longitude: 92.7789, location_name: "Silchar, Barak Valley", district: "Cachar", state: "Assam", photo_url: null, reported_by: "weather_system", created_at: "2026-08-28 16:00", updated_at: "2026-08-28 16:00" },
  { id: 5, title: "Road Crack Near Itanagar", description: "Longitudinal crack on approach road to Naharlagun.", type: "road_damage", severity: "medium", status: "reported", latitude: 27.1, longitude: 93.6167, location_name: "Itanagar-Naharlagun Road", district: "Papum Pare", state: "Arunachal Pradesh", photo_url: null, reported_by: "field_staff", created_at: "2026-08-28 11:00", updated_at: "2026-08-28 11:00" },
];
