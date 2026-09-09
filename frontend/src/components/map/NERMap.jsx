import React, { useEffect, useRef, useState } from 'react';
import './NERMap.css';

// NER node coordinates (lat, lng) for road network visualization — all 8 NE states
const NODE_COORDS = {
  // Sikkim
  Gangtok:       [27.3389, 88.6065],
  // West Bengal gateway
  Siliguri:      [26.7271, 88.3953],
  // Assam
  Guwahati:      [26.1445, 91.7362],
  Tezpur:        [26.6338, 92.7897],
  Nagaon:        [26.3500, 92.6840],
  Jorhat:        [26.7509, 94.2037],
  Dibrugarh:     [27.4728, 94.9120],
  Tinsukia:      [27.4922, 95.3547],
  Silchar:       [24.8333, 92.7789],
  // Meghalaya
  Shillong:      [25.5788, 91.8933],
  Tura:          [25.5144, 90.2187],
  // Arunachal Pradesh
  Itanagar:      [27.1000, 93.6167],
  Tawang:        [27.5860, 91.8595],
  // Nagaland
  Dimapur:       [25.9042, 93.7266],
  Kohima:        [25.6751, 94.1086],
  Mokokchung:    [26.3225, 94.5204],
  // Manipur
  Imphal:        [24.8170, 93.9368],
  Churachandpur: [24.3337, 93.6833],
  // Mizoram
  Aizawl:        [23.7271, 92.7176],
  Lunglei:       [22.8839, 92.7275],
  // Tripura
  Agartala:      [23.8315, 91.2868],
};

// State label coordinates
const STATE_LABELS = {
  'Sikkim': [27.5330, 88.5122],
  'Assam': [26.2006, 92.9376],
  'Meghalaya': [25.4670, 91.3662],
  'Arunachal Pradesh': [28.2180, 94.7278],
  'Nagaland': [26.1584, 94.5624],
  'Manipur': [24.6637, 93.9063],
  'Mizoram': [23.1645, 92.9376],
  'Tripura': [23.9408, 91.9882],
};

// Bounding box for North East India (restricts map panning)
const NE_BOUNDS = [
  [21.5, 87.5],  // South-West corner
  [29.5, 97.5],  // North-East corner
];

// Severity colors
const SEVERITY_COLORS = {
  critical: '#EF4444',
  high: '#FF6B35',
  medium: '#F59E0B',
  low: '#10B981',
};

const STATUS_COLORS = {
  in_transit: '#00FF66',
  delayed: '#F59E0B',
  blocked: '#EF4444',
};

function getRiskColor(segment) {
  if (segment.is_blocked) return '#EF4444';
  const risk = segment.landslide_risk + segment.weather_hazard;
  if (risk > 1.0) return '#EF4444';
  if (risk > 0.5) return '#F59E0B';
  return '#10B981';
}

function getRiskLabel(segment) {
  if (segment.is_blocked) return 'BLOCKED';
  const risk = segment.landslide_risk + segment.weather_hazard;
  if (risk > 1.0) return 'High Risk';
  if (risk > 0.5) return 'Moderate Risk';
  return 'Low Risk';
}

export function NERMap({ segments = [], incidents = [], fleet = [], height = '500px', showFleet = false, showIncidents = true }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);

  useEffect(() => {
    let L;
    const initMap = async () => {
      // Dynamic import to avoid SSR issues
      L = await import('leaflet');
      
      // Fix leaflet default icon issue
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (mapInstanceRef.current) return; // Already initialized

      // Initialize map centered on NER, bounded to NE India only
      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
        maxBounds: NE_BOUNDS,
        maxBoundsViscosity: 0.9,
        minZoom: 6,
        maxZoom: 18,
      }).setView([25.5, 92.5], 7);

      // Free CartoDB Dark Matter No Labels — no API key needed
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: 'abcd',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
      updateLayers(L, map);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update layers when data changes
  useEffect(() => {
    const updateAsync = async () => {
      const L = await import('leaflet');
      if (mapInstanceRef.current) {
        updateLayers(L, mapInstanceRef.current);
      }
    };
    updateAsync();
  }, [segments, incidents, fleet, showFleet, showIncidents]);

  function updateLayers(L, map) {
    // Clear old layers
    layersRef.current.forEach(layer => map.removeLayer(layer));
    layersRef.current = [];

    // --- Draw Road Segments ---
    segments.forEach(seg => {
      const fromCoord = NODE_COORDS[seg.u];
      const toCoord = NODE_COORDS[seg.v];
      if (!fromCoord || !toCoord) return;

      const color = getRiskColor(seg);
      const weight = seg.is_blocked ? 5 : 3;
      const dashArray = seg.is_blocked ? '10, 8' : null;

      const line = L.polyline([fromCoord, toCoord], {
        color,
        weight,
        opacity: 0.85,
        dashArray,
      }).addTo(map);

      line.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 180px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px; color: ${color};">
            ${seg.u} → ${seg.v}
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${getRiskLabel(seg)}</div>
          <table style="font-size: 12px; width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 2px 0; color: #888;">Distance</td><td style="text-align: right; font-weight: 500;">${seg.distance_km} km</td></tr>
            <tr><td style="padding: 2px 0; color: #888;">Landslide Risk</td><td style="text-align: right; font-weight: 500; color: ${seg.landslide_risk > 0.5 ? '#EF4444' : '#10B981'};">${(seg.landslide_risk * 100).toFixed(0)}%</td></tr>
            <tr><td style="padding: 2px 0; color: #888;">Weather Hazard</td><td style="text-align: right; font-weight: 500; color: ${seg.weather_hazard > 0.3 ? '#F59E0B' : '#10B981'};">${(seg.weather_hazard * 100).toFixed(0)}%</td></tr>
            <tr><td style="padding: 2px 0; color: #888;">Status</td><td style="text-align: right; font-weight: 600; color: ${seg.is_blocked ? '#EF4444' : '#10B981'};">${seg.is_blocked ? '🚫 BLOCKED' : '✅ Open'}</td></tr>
          </table>
        </div>
      `);

      layersRef.current.push(line);
    });

    // --- Draw State Labels ---
    Object.entries(STATE_LABELS).forEach(([name, coords]) => {
      const marker = L.circleMarker(coords, {
        radius: 0,
        opacity: 0,
        fillOpacity: 0
      }).addTo(map);

      marker.bindTooltip(name, {
        permanent: true,
        direction: 'center',
        className: 'ner-state-label',
        interactive: false
      });

      layersRef.current.push(marker);
    });

    // --- Draw Node markers ---
    Object.entries(NODE_COORDS).forEach(([name, coords]) => {
      const marker = L.circleMarker(coords, {
        radius: 6,
        fillColor: '#00FF66',
        color: '#000',
        weight: 1,
        fillOpacity: 0.9,
      }).addTo(map);

      marker.bindTooltip(name, {
        permanent: true,
        direction: 'right',
        className: 'ner-tooltip',
        offset: [8, 0],
      });

      layersRef.current.push(marker);
    });

    // --- Draw Incident markers ---
    if (showIncidents && incidents.length > 0) {
      incidents.forEach(inc => {
        if (!inc.latitude || !inc.longitude) return;

        const color = SEVERITY_COLORS[inc.severity] || SEVERITY_COLORS.medium;
        
        const icon = L.divIcon({
          className: 'incident-marker',
          html: `<div style="
            width: 24px; height: 24px; border-radius: 50%;
            background: ${color}; border: 2px solid #fff;
            display: flex; align-items: center; justify-content: center;
            font-size: 12px; color: #fff; font-weight: bold;
            box-shadow: 0 0 8px ${color}80;
          ">⚠</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([inc.latitude, inc.longitude], { icon }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 200px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${inc.title}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${inc.location_name || ''} • ${inc.district || ''}, ${inc.state || ''}</div>
            <div style="font-size: 12px; margin-bottom: 6px;">${inc.description || ''}</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${color}22; color: ${color};">${inc.severity?.toUpperCase()}</span>
              <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #33333340; color: #666;">${inc.type}</span>
              <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #33333340; color: #666;">${inc.status}</span>
            </div>
          </div>
        `);

        layersRef.current.push(marker);
      });
    }

    // --- Draw Fleet markers ---
    if (showFleet && fleet.length > 0) {
      fleet.forEach(v => {
        if (!v.current_lat || !v.current_lng) return;

        const statusColor = STATUS_COLORS[v.status] || STATUS_COLORS.in_transit;

        const icon = L.divIcon({
          className: 'fleet-marker',
          html: `<div style="
            width: 28px; height: 28px; border-radius: 6px;
            background: ${statusColor}; border: 2px solid #fff;
            display: flex; align-items: center; justify-content: center;
            font-size: 14px; color: #000; font-weight: bold;
            box-shadow: 0 0 10px ${statusColor}60;
            transform: rotate(-20deg);
          ">🚛</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([v.current_lat, v.current_lng], { icon }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 200px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${v.vehicle_id}</div>
            <table style="font-size: 12px; width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 2px 0; color: #888;">Driver</td><td style="text-align: right;">${v.driver_name}</td></tr>
              <tr><td style="padding: 2px 0; color: #888;">Cargo</td><td style="text-align: right; font-weight: 500;">${v.cargo_type}</td></tr>
              <tr><td style="padding: 2px 0; color: #888;">Route</td><td style="text-align: right;">${v.origin} → ${v.destination}</td></tr>
              <tr><td style="padding: 2px 0; color: #888;">Status</td><td style="text-align: right; color: ${statusColor}; font-weight: 600;">${v.status?.toUpperCase()}</td></tr>
            </table>
          </div>
        `);

        layersRef.current.push(marker);
      });
    }
  }

  return (
    <div className="ner-map-container" style={{ height }}>
      <div ref={mapRef} className="ner-map" style={{ height: '100%', width: '100%' }} />
      <div className="map-legend">
        <div className="legend-title">Road Status</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#10B981' }}></span> Low Risk</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#F59E0B' }}></span> Moderate</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#EF4444' }}></span> High Risk / Blocked</div>
      </div>
    </div>
  );
}
