import React, { useState, useEffect } from 'react';
import { Send, Bell, MapPin, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { fetchIncidents, fetchAlerts, createAlertWithTranslation, translateText } from '../../data/api';
import './District.css';

// All 8 NE states with key districts
const NER_DISTRICTS = [
  // Assam
  { name: 'Kamrup Metropolitan', state: 'Assam', city: 'Guwahati' },
  { name: 'Golaghat', state: 'Assam', city: 'Golaghat' },
  { name: 'Sonitpur', state: 'Assam', city: 'Tezpur' },
  { name: 'Nagaon', state: 'Assam', city: 'Nagaon' },
  { name: 'Jorhat', state: 'Assam', city: 'Jorhat' },
  { name: 'Dibrugarh', state: 'Assam', city: 'Dibrugarh' },
  { name: 'Tinsukia', state: 'Assam', city: 'Tinsukia' },
  { name: 'Cachar', state: 'Assam', city: 'Silchar' },

  // Arunachal Pradesh
  { name: 'Papum Pare', state: 'Arunachal Pradesh', city: 'Itanagar' },
  { name: 'Tawang', state: 'Arunachal Pradesh', city: 'Tawang' },
  { name: 'East Siang', state: 'Arunachal Pradesh', city: 'Pasighat' },
  { name: 'West Kameng', state: 'Arunachal Pradesh', city: 'Bomdila' },
  { name: 'Lower Subansiri', state: 'Arunachal Pradesh', city: 'Ziro' },

  // Meghalaya
  { name: 'East Khasi Hills', state: 'Meghalaya', city: 'Shillong' },
  { name: 'West Garo Hills', state: 'Meghalaya', city: 'Tura' },
  { name: 'Ri-Bhoi', state: 'Meghalaya', city: 'Nongpoh' },
  { name: 'South West Khasi Hills', state: 'Meghalaya', city: 'Mawkyrwat' },

  // Nagaland
  { name: 'Kohima', state: 'Nagaland', city: 'Kohima' },
  { name: 'Dimapur', state: 'Nagaland', city: 'Dimapur' },
  { name: 'Mokokchung', state: 'Nagaland', city: 'Mokokchung' },
  { name: 'Mon', state: 'Nagaland', city: 'Mon' },
  { name: 'Wokha', state: 'Nagaland', city: 'Wokha' },

  // Manipur
  { name: 'Imphal East', state: 'Manipur', city: 'Imphal' },
  { name: 'Imphal West', state: 'Manipur', city: 'Imphal' },
  { name: 'Bishnupur', state: 'Manipur', city: 'Bishnupur' },
  { name: 'Churachandpur', state: 'Manipur', city: 'Churachandpur' },
  { name: 'Thoubal', state: 'Manipur', city: 'Thoubal' },

  // Mizoram
  { name: 'Aizawl', state: 'Mizoram', city: 'Aizawl' },
  { name: 'Kolasib', state: 'Mizoram', city: 'Kolasib' },
  { name: 'Lunglei', state: 'Mizoram', city: 'Lunglei' },
  { name: 'Champhai', state: 'Mizoram', city: 'Champhai' },

  // Tripura
  { name: 'West Tripura', state: 'Tripura', city: 'Agartala' },
  { name: 'Gomati', state: 'Tripura', city: 'Udaipur' },
  { name: 'Dhalai', state: 'Tripura', city: 'Ambassa' },
  { name: 'Unakoti', state: 'Tripura', city: 'Kailashahar' },

  // Sikkim
  { name: 'East Sikkim', state: 'Sikkim', city: 'Gangtok' },
  { name: 'South Sikkim', state: 'Sikkim', city: 'Namchi' },
  { name: 'West Sikkim', state: 'Sikkim', city: 'Gyalshing' },
  { name: 'North Sikkim', state: 'Sikkim', city: 'Mangan' },
];

// Group districts by state for the dropdown
const STATES = [...new Set(NER_DISTRICTS.map(d => d.state))];

export function DistrictPage() {
  const [selectedDistrict, setSelectedDistrict] = useState('Kamrup Metropolitan');
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [alertForm, setAlertForm] = useState({
    title: '', message_en: '', message_as: '', message_hi: '', message_mn: '',
    severity: 'warning', target_audience: 'all'
  });

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

  async function handleAutoTranslate() {
    if (!alertForm.message_en.trim()) return;
    setIsTranslating(true);
    try {
      const result = await translateText({
        text: alertForm.message_en,
        target_langs: ['as', 'hi', 'mn']
      });
      setAlertForm(f => ({
        ...f,
        message_as: result.translations?.as || f.message_as,
        message_hi: result.translations?.hi || f.message_hi,
        message_mn: result.translations?.mn || f.message_mn,
      }));
    } catch (err) {
      console.error('Auto-translate failed:', err);
    } finally {
      setIsTranslating(false);
    }
  }

  async function handleSendAlert(e) {
    e.preventDefault();
    setIsSending(true);
    try {
      // Uses the /api/alerts/translate endpoint which auto-translates if languages are empty
      await createAlertWithTranslation({ ...alertForm, district: selectedDistrict });
      setShowAlertForm(false);
      setAlertForm({
        title: '', message_en: '', message_as: '', message_hi: '', message_mn: '',
        severity: 'warning', target_audience: 'all'
      });
      loadDistrictData();
    } catch (err) {
      console.error('Failed to send alert:', err);
    } finally {
      setIsSending(false);
    }
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
          {STATES.map(state => (
            <optgroup key={state} label={`── ${state} ──`}>
              {NER_DISTRICTS.filter(d => d.state === state).map(d => (
                <option key={d.name} value={d.name}>{d.name} ({d.city})</option>
              ))}
            </optgroup>
          ))}
        </select>
      </header>

      <div className="district-overview glass-panel">
        <div className="district-info">
          <MapPin size={20} color="var(--accent-primary)" />
          <h3>{selectedDistrict}</h3>
          <span className="district-state">{districtInfo?.state}</span>
          {districtInfo?.city && <span className="district-city">• HQ: {districtInfo.city}</span>}
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
              
              <button
                type="button"
                className="btn-translate"
                onClick={handleAutoTranslate}
                disabled={isTranslating || !alertForm.message_en.trim()}
              >
                {isTranslating ? <><Loader2 size={14} className="spin" /> Translating...</> : <><Sparkles size={14} /> Auto-Translate to Regional Languages</>}
              </button>

              <textarea placeholder="বাৰ্তা (অসমীয়া) — Assamese translation" value={alertForm.message_as} onChange={e => setAlertForm(f => ({...f, message_as: e.target.value}))} />
              <textarea placeholder="संदेश (हिंदी) — Hindi translation" value={alertForm.message_hi} onChange={e => setAlertForm(f => ({...f, message_hi: e.target.value}))} />
              <textarea placeholder="ꯃꯦꯁꯦꯖ (ꯃꯅꯤꯄꯨꯔꯤ) — Manipuri translation" value={alertForm.message_mn} onChange={e => setAlertForm(f => ({...f, message_mn: e.target.value}))} />
              
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
              <button type="submit" className="btn-primary" disabled={isSending}>
                {isSending ? <><Loader2 size={14} className="spin" /> Sending...</> : <><Send size={14} /> Send Alert</>}
              </button>
            </form>
          )}

          <div className="alerts-list">
            {alerts.map(a => (
              <div key={a.id} className="alert-item" style={{ borderLeft: `3px solid ${a.severity === 'critical' ? 'var(--risk-high)' : a.severity === 'warning' ? 'var(--risk-medium)' : 'var(--accent-secondary)'}` }}>
                <h4>{a.title}</h4>
                <p>{a.message_en}</p>
                {a.message_as && <p className="translated">🇮🇳 অসমীয়া: {a.message_as}</p>}
                {a.message_hi && <p className="translated">🇮🇳 हिंदी: {a.message_hi}</p>}
                {a.message_mn && <p className="translated">🇮🇳 মণিপুরী: {a.message_mn}</p>}
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
