import React, { useState, useEffect } from 'react';
import { Truck, AlertCircle, CheckCircle, XCircle, RotateCw } from 'lucide-react';
import { fetchFleet, fetchSegments, rerouteFleet } from '../../data/api';
import { NERMap } from '../map/NERMap';
import { useTranslation } from 'react-i18next';
import 'leaflet/dist/leaflet.css';
import './Fleet.css';

const STATUS_CONFIG = {
  in_transit: { color: 'var(--accent-primary)', icon: CheckCircle, label: 'In Transit' },
  delayed: { color: 'var(--risk-medium)', icon: AlertCircle, label: 'Delayed' },
  blocked: { color: 'var(--risk-high)', icon: XCircle, label: 'Blocked' },
};

export function FleetPage() {
  const [vehicles, setVehicles] = useState([]);
  const [segments, setSegments] = useState([]);
  const [rerouteResult, setRerouteResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => { loadFleet(); }, []);

  async function loadFleet() {
    setLoading(true);
    try {
      const [data, segs] = await Promise.all([
        fetchFleet(),
        fetchSegments().catch(() => []),
      ]);
      setVehicles(data);
      setSegments(segs);
    } catch {
      setVehicles(MOCK_FLEET);
    }
    setLoading(false);
  }

  async function handleMassReroute() {
    try {
      const result = await rerouteFleet({ blocked_segment_u: 'Dimapur', blocked_segment_v: 'Kohima' });
      setRerouteResult(result);
    } catch {
      setRerouteResult({ blocked_segment: 'Dimapur → Kohima', total_vehicles_checked: 5, rerouted: [{ vehicle_id: 'NER-TRK-001', new_route: ['Guwahati', 'Shillong', 'Silchar', 'Imphal'], new_distance_km: 570, new_eta_hours: 14.2 }], no_route_available: [] });
    }
  }

  return (
    <div className="fleet-page">
      <header className="page-header">
        <div>
          <h2 className="page-title">{t('fleet.title')}</h2>
          <p className="page-subtitle">{t('fleet.subtitle')}</p>
        </div>
        <button className="btn-primary reroute-btn" onClick={handleMassReroute}>
          <RotateCw size={16} /> Mass Reroute (Block Dimapur→Kohima)
        </button>
      </header>

      <div className="fleet-stats-row">
        <div className="fleet-stat glass-panel">
          <Truck size={20} color="var(--accent-primary)" />
          <span className="stat-value text-glow">{vehicles.length}</span>
          <span className="stat-label">Total Vehicles</span>
        </div>
        <div className="fleet-stat glass-panel">
          <CheckCircle size={20} color="var(--accent-primary)" />
          <span className="stat-value" style={{ color: 'var(--accent-primary)' }}>{vehicles.filter(v => v.status === 'in_transit').length}</span>
          <span className="stat-label">In Transit</span>
        </div>
        <div className="fleet-stat glass-panel">
          <AlertCircle size={20} color="var(--risk-medium)" />
          <span className="stat-value" style={{ color: 'var(--risk-medium)' }}>{vehicles.filter(v => v.status === 'delayed').length}</span>
          <span className="stat-label">Delayed</span>
        </div>
        <div className="fleet-stat glass-panel">
          <XCircle size={20} color="var(--risk-high)" />
          <span className="stat-value" style={{ color: 'var(--risk-high)' }}>{vehicles.filter(v => v.status === 'blocked').length}</span>
          <span className="stat-label">Blocked</span>
        </div>
      </div>

      <div className="fleet-map-panel glass-panel" style={{ padding: '1.5rem' }}>
        <div className="panel-header" style={{ marginBottom: '1rem' }}>
          <h3>Fleet Positions — Live Map</h3>
        </div>
        <NERMap
          segments={segments}
          fleet={vehicles}
          incidents={[]}
          showFleet={true}
          showIncidents={false}
          height="380px"
        />
      </div>


      <div className="fleet-table-container glass-panel">
        <table className="fleet-table">
          <thead>
            <tr>
              <th>{t('fleet.vehicle_id')}</th>
              <th>Type</th>
              <th>Driver</th>
              <th>Cargo</th>
              <th>Origin → Destination</th>
              <th>{t('fleet.location')}</th>
              <th>{t('fleet.status')}</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => {
              const cfg = STATUS_CONFIG[v.status] || STATUS_CONFIG.in_transit;
              return (
                <tr key={v.vehicle_id}>
                  <td className="vehicle-id">{v.vehicle_id}</td>
                  <td>{v.vehicle_type}</td>
                  <td>{v.driver_name}</td>
                  <td>{v.cargo_type}</td>
                  <td>{v.origin} → {v.destination}</td>
                  <td className="coords">{v.current_lat?.toFixed(4)}, {v.current_lng?.toFixed(4)}</td>
                  <td>
                    <span className="fleet-status" style={{ color: cfg.color, background: `${cfg.color}22` }}>
                      <cfg.icon size={14} /> {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rerouteResult && (
        <div className="reroute-result glass-panel">
          <h3>Reroute Results — Blocked: {rerouteResult.blocked_segment}</h3>
          <p className="reroute-summary">{rerouteResult.total_vehicles_checked} vehicles checked • {rerouteResult.rerouted.length} rerouted • {rerouteResult.no_route_available.length} stranded</p>
          {rerouteResult.rerouted.map((r, i) => (
            <div key={i} className="reroute-item">
              <strong>{r.vehicle_id}</strong> ({r.driver_name} — {r.cargo_type})
              <div className="new-route">New route: {r.new_route.join(' → ')} • {r.new_distance_km} km • ETA {r.new_eta_hours} hrs</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const MOCK_FLEET = [
  { id: 1, vehicle_id: "NER-TRK-001", vehicle_type: "truck", driver_name: "Rajesh Kumar", cargo_type: "Medical Supplies", origin: "Guwahati", destination: "Imphal", current_lat: 26.1445, current_lng: 91.7362, status: "in_transit", last_updated: "2026-08-28 16:00" },
  { id: 2, vehicle_id: "NER-TRK-002", vehicle_type: "truck", driver_name: "Bimal Das", cargo_type: "Food Grains", origin: "Siliguri", destination: "Gangtok", current_lat: 26.8660, current_lng: 88.4310, status: "in_transit", last_updated: "2026-08-28 15:45" },
  { id: 3, vehicle_id: "NER-TRK-004", vehicle_type: "truck", driver_name: "Sanjay Boro", cargo_type: "Fuel", origin: "Dibrugarh", destination: "Tezpur", current_lat: 26.7509, current_lng: 93.9422, status: "delayed", last_updated: "2026-08-28 14:30" },
  { id: 4, vehicle_id: "NER-TRK-006", vehicle_type: "truck", driver_name: "Thangjam Ibomcha", cargo_type: "Rice & Essentials", origin: "Silchar", destination: "Aizawl", current_lat: 24.5, current_lng: 92.8, status: "blocked", last_updated: "2026-08-28 13:00" },
];
