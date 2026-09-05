import React, { useState, useEffect } from 'react';
import { Send, Bell, MapPin, AlertTriangle } from 'lucide-react';
import { fetchIncidents, fetchAlerts, createAlert } from '../../data/api';
import './District.css';

const NER_DISTRICTS = [
  { name: 'Golaghat', state: 'Assam' },
  { name: 'Sonitpur', state: 'Assam' },
  { name: 'Cachar', state: 'Assam' },
  { name: 'Kohima', state: 'Nagaland' },
  { name: 'Imphal East', state: 'Manipur' },
  { name: 'Papum Pare', state: 'Arunachal Pradesh' },
  { name: 'East Sikkim', state: 'Sikkim' },
  { name: 'Kolasib', state: 'Mizoram' },
];

export function DistrictPage() {
  const [selectedDistrict, setSelectedDistrict] = useState('Golaghat');
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertForm, setAlertForm] = useState({ title: '', message_en: '', message_as: '', message_hi: '', severity: 'warning', target_audience: 'drivers' });

  useEffect(() => { loadDistrictData(); }, [selectedDistrict]);

  async function loadDistrictData() {
    try {
      const [inc, al] = await Promise.all([
        fetchIncidents({ district: selectedDistrict }),
        fetchAlerts()
      ]);
      setIncidents(inc);
      setAlerts(al.filter(a => !a.district || a.district === selectedDistrict));
    } catch {
      setIncidents(MOCK_INCIDENTS.filter(i => i.district === selectedDistrict));
      setAlerts(MOCK_ALERTS);
    }
  }

  async function handleSendAlert(e) {
    e.preventDefault();
    try {
      await createAlert({ ...alertForm, district: selectedDistrict });
      setShowAlertForm(false);
      setAlertForm({ title: '', message_en: '', message_as: '', message_hi: '', severity: 'warning', target_audience: 'drivers' });
      loadDistrictData();
    } catch { /* offline */ }
  }

  const districtInfo = NER_DISTRICTS.find(d => d.name === selectedDistrict);

  return (
    <div className="district-page">
      <header className="page-header">
        <div>
          <h2 className="page-title">District Administration</h2>
          <p className="page-subtitle">Manage incidents and send alerts for your district</p>
        </div>
        <select className="district-picker" value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)}>
          {NER_DISTRICTS.map(d => <option key={d.name} value={d.name}>{d.name}, {d.state}</option>)}
        </select>
      </header>

      <div className="district-overview glass-panel">
        <div className="district-info">
          <MapPin size={20} color="var(--accent-primary)" />
          <h3>{selectedDistrict}</h3>
          <span className="district-state">{districtInfo?.state}</span>
        </div>
        <div className="district-stats">
          <div className="d-stat">
            <span className="d-stat-val text-glow">{incidents.length}</span>
            <span className="d-stat-label">Active Incidents</span>
          </div>
          <div className="d-stat">
            <span className="d-stat-val" style={{ color: 'var(--risk-high)' }}>{incidents.filter(i => i.severity === 'critical').length}</span>
            <span className="d-stat-label">Critical</span>
          </div>
          <div className="d-stat">
            <span className="d-stat-val" style={{ color: 'var(--risk-medium)' }}>{alerts.length}</span>
            <span className="d-stat-label">Active Alerts</span>
          </div>
        </div>
      </div>

      <div className="district-grid">
        <div className="district-incidents glass-panel">
          <div className="panel-header">
            <h3>Incoming Field Reports</h3>
          </div>
          {incidents.length === 0 ? (
            <p className="empty-state">No incidents reported in this district.</p>
          ) : (
            <div className="d-incidents-list">
              {incidents.map(inc => (
                <div key={inc.id} className="d-incident-item">
                  <div className="d-inc-severity" style={{ background: inc.severity === 'critical' ? 'var(--risk-high)' : inc.severity === 'high' ? '#FF6B35' : inc.severity === 'medium' ? 'var(--risk-medium)' : 'var(--risk-low)' }}></div>
                  <div className="d-inc-body">
                    <h4>{inc.title}</h4>
                    <p>{inc.description}</p>
                    <span className="d-inc-meta">{inc.location_name} • {inc.created_at}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="district-alerts glass-panel">
          <div className="panel-header">
            <h3>Alerts Sent</h3>
            <button className="btn-primary" onClick={() => setShowAlertForm(!showAlertForm)}>
              <Bell size={14} /> New Alert
            </button>
          </div>

          {showAlertForm && (
            <form className="alert-form" onSubmit={handleSendAlert}>
              <input type="text" placeholder="Alert title" value={alertForm.title} onChange={e => setAlertForm(f => ({...f, title: e.target.value}))} required />
              <textarea placeholder="Message (English)" value={alertForm.message_en} onChange={e => setAlertForm(f => ({...f, message_en: e.target.value}))} required />
              <textarea placeholder="বাৰ্তা (অসমীয়া) — Assamese translation (optional)" value={alertForm.message_as} onChange={e => setAlertForm(f => ({...f, message_as: e.target.value}))} />
              <textarea placeholder="संदेश (हिंदी) — Hindi translation (optional)" value={alertForm.message_hi} onChange={e => setAlertForm(f => ({...f, message_hi: e.target.value}))} />
              <div className="form-row">
                <select value={alertForm.severity} onChange={e => setAlertForm(f => ({...f, severity: e.target.value}))}>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
                <select value={alertForm.target_audience} onChange={e => setAlertForm(f => ({...f, target_audience: e.target.value}))}>
                  <option value="all">All</option>
                  <option value="drivers">Truck Drivers</option>
                  <option value="officials">Officials</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <button type="submit" className="btn-primary"><Send size={14} /> Send Alert</button>
            </form>
          )}

          <div className="alerts-list">
            {alerts.map(a => (
              <div key={a.id} className="alert-item" style={{ borderLeft: `3px solid ${a.severity === 'critical' ? 'var(--risk-high)' : a.severity === 'warning' ? 'var(--risk-medium)' : 'var(--accent-secondary)'}` }}>
                <h4>{a.title}</h4>
                <p>{a.message_en}</p>
                {a.message_as && <p className="translated">🇮🇳 {a.message_as}</p>}
                <span className="alert-meta">{a.target_audience} • {a.created_at}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const MOCK_INCIDENTS = [
  { id: 1, title: "NH-37 Partial Washout", description: "Heavy rainfall caused partial road washout.", type: "road_damage", severity: "critical", status: "reported", latitude: 26.5775, longitude: 93.1711, location_name: "Near Kaziranga", district: "Golaghat", state: "Assam", created_at: "2026-08-28 15:30", updated_at: "" },
];
const MOCK_ALERTS = [
  { id: 1, title: "NH-37 Alternate Route Advisory", message_en: "Use Tezpur bypass via NH-15.", message_as: "NH-15 হৈ তেজপুৰ বাইপাছ ব্যৱহাৰ কৰক।", message_hi: null, message_mn: null, severity: "warning", district: "Golaghat", target_audience: "drivers", is_active: true, created_at: "2026-08-28 16:00" },
];
