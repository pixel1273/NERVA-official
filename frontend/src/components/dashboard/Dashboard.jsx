import React, { useState, useEffect } from 'react';
import { AlertOctagon, TrendingUp, CloudRain, MapPin, Zap, BellRing, Loader2, X, Truck } from 'lucide-react';
import { fetchDashboardStats, fetchIncidents, fetchSegments, fetchFleet, generateEarlyWarningAlerts } from '../../data/api';
import { NERMap } from '../map/NERMap';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';

const SEVERITY_COLORS = {
  critical: 'var(--risk-high)',
  high: '#FF6B35',
  medium: 'var(--risk-medium)',
  low: 'var(--risk-low)',
};

export function Dashboard() {
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [segments, setSegments] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [showFullMap, setShowFullMap] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [statsData, incData, segData, fleetData] = await Promise.all([
        fetchDashboardStats().catch(() => null),
        fetchIncidents({ limit: 10 }).catch(() => []),
        fetchSegments().catch(() => []),
        fetchFleet().catch(() => []),
      ]);
      if (statsData) setStats(statsData);
      setIncidents(incData);
      setSegments(segData);
      setFleet(fleetData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function runEarlyWarningScan() {
    setScanning(true);
    try {
      const result = await generateEarlyWarningAlerts();
      setLastScan(result);
      await loadAll();
    } catch (err) {
      alert('Early Warning System error: ' + err.message);
    } finally {
      setScanning(false);
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>Initializing Command Center...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div>
            <h2 className="page-title">Command Center Overview</h2>
            <p className="page-subtitle">North Eastern Region (NER) Logistics & Intelligence</p>
          </div>
          <button
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}
            onClick={runEarlyWarningScan}
            disabled={scanning}
          >
            {scanning ? <Loader2 className="spin" size={18} /> : <Zap size={18} />}
            {scanning ? 'Scanning Region...' : 'Trigger Early Warning Scan'}
          </button>
        </div>
        <div className="status-badge">
          <span className="status-dot"></span>
          System Online
        </div>
      </header>

      <div className="metrics-grid">
        <div className="metric-card glass-panel">
          <div className="metric-header">
            <AlertOctagon size={24} color="var(--risk-high)" />
            <h3>Active Disruptions</h3>
          </div>
          <div className="metric-value text-glow" style={{ color: 'var(--risk-high)' }}>
            {stats?.incidents?.active_incidents || '0'}
          </div>
          <p className="metric-trend">{stats?.incidents?.critical_count || 0} critical • {stats?.incidents?.high_count || 0} high</p>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-header">
            <MapPin size={24} color="var(--accent-primary)" />
            <h3>Road Network</h3>
          </div>
          <div className="metric-value text-glow">
            {stats?.routes?.operational_pct || '0'}%
          </div>
          <p className="metric-trend">{stats?.routes?.blocked_segments || '0'} segments blocked</p>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-header">
            <Truck size={24} color="var(--accent-secondary)" />
            <h3>Fleet Status</h3>
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-secondary)' }}>
            {stats?.fleet?.total_vehicles || '0'}
          </div>
          <p className="metric-trend">{stats?.fleet?.in_transit || 0} in transit • {stats?.fleet?.blocked || 0} blocked</p>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-header">
            <CloudRain size={24} color="var(--risk-medium)" />
            <h3>Active Alerts</h3>
          </div>
          <div className="metric-value" style={{ color: 'var(--risk-medium)' }}>
            {stats?.active_alerts || '0'}
          </div>
          <p className="metric-trend">Multilingual alerts active</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="panel map-preview glass-panel">
          <div className="panel-header">
            <h3>Live Intelligence Map</h3>
            <button className="btn-primary" onClick={() => setShowFullMap(!showFullMap)}>
              {showFullMap ? 'Minimize' : 'Expand Map'}
            </button>
          </div>
          <NERMap
            segments={segments}
            incidents={incidents}
            fleet={fleet}
            showFleet={true}
            showIncidents={true}
            height={showFullMap ? '650px' : '400px'}
          />
        </div>

        <div className="panel field-reports glass-panel">
          <div className="panel-header">
            <h3>Latest Field Reports</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{incidents.length} reports</span>
          </div>
          <div className="status-legend" style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div className="report-indicator" style={{ background: 'var(--risk-high)', width: '8px', height: '8px' }}></div> Critical</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div className="report-indicator" style={{ background: 'var(--risk-medium)', width: '8px', height: '8px' }}></div> Warning</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div className="report-indicator" style={{ background: 'var(--risk-low)', width: '8px', height: '8px' }}></div> Resolved</span>
          </div>
          <div className="reports-list">
            {incidents.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No field reports yet.</p>
            ) : (
              incidents.map(inc => (
                <div key={inc.id} className="report-item">
                  <div className="report-indicator" style={{ background: SEVERITY_COLORS[inc.severity] || 'var(--risk-medium)' }}></div>
                  <div className="report-info">
                    <h4>{inc.title}</h4>
                    <p>{inc.location_name || inc.district || 'Unknown'} • {inc.state || ''} • {inc.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {lastScan && (
        <div className="scan-overlay" style={styles.overlay}>
          <div className="glass-panel" style={styles.modal}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BellRing color="var(--accent-primary)" />
                <h3>Scan Complete: Early Warning Results</h3>
              </div>
              <button onClick={() => setLastScan(null)} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <p>AI analysis identified <strong>{lastScan.alerts_created}</strong> high-risk zones requiring immediate attention.</p>
              <div style={styles.resultsList}>
                {(lastScan.alerts || []).map((alert, i) => (
                  <div key={i} style={styles.alertItem}>
                    <div>
                      <strong>{alert.title}</strong>
                      <p style={{ fontSize: '0.8rem', margin: 0, color: '#aaa' }}>{alert.message_en}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn-primary" onClick={() => setLastScan(null)} style={styles.modalBtn}>Acknowledge & Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(4px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  modal: {
    width: '100%',
    maxWidth: '500px',
    padding: '2rem',
    position: 'relative',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  modalBody: {
    marginBottom: '2rem',
  },
  resultsList: {
    marginTop: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  alertItem: {
    display: 'flex',
    gap: '0.75rem',
    padding: '0.75rem',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    borderLeft: '4px solid var(--risk-high)',
  },
  modalBtn: {
    width: '100%',
    cursor: 'pointer',
  }
};
