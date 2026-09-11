import React, { useEffect, useRef, useState, useCallback } from 'react';
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

export function NERMap({ 
  segments = [], 
  incidents = [], 
  fleet = [], 
  height = '500px', 
  showFleet = false, 
  showIncidents = true,
  showHeatmap = false,
  enableClustering = false,
  showStateBoundaries = true,
  onSegmentClick = null,
  onIncidentClick = null,
  onStateClick = null
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);
  const heatmapLayerRef = useRef(null);
  const markerClusterGroupRef = useRef(null);
  const boundaryLayerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [geoJsonData, setGeoJsonData] = useState(null);

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

      const useBhuvan = import.meta.env.VITE_USE_BHUVAN !== 'false'; // Default to true
      const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
      
      if (useBhuvan) {
        // ISRO Bhuvan WMS Tile Layer (Perfect for SIH)
        L.tileLayer.wms('https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/wms/', {
          layers: 'india3', // Bhuvan base map layer
          format: 'image/jpeg',
          transparent: false,
          version: '1.1.1',
          attribution: 'Map data © <a href="https://bhuvan.nrsc.gov.in/">ISRO Bhuvan</a>',
          maxZoom: 18,
        }).addTo(map);
      } else if (mapboxToken) {
        // High-quality Mapbox Satellite Streets
        L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`, {
          attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
        }).addTo(map);
      } else {
        // Free CartoDB Dark Matter No Labels — fallback
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors © CARTO',
          subdomains: 'abcd',
          maxZoom: 18,
        }).addTo(map);
      }

      mapInstanceRef.current = map;
      setMapLoaded(true);
      
      // Load GeoJSON data
      loadGeoJsonBoundaries();
      
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
      if (mapInstanceRef.current && mapLoaded) {
        updateLayers(L, mapInstanceRef.current);
      }
    };
    updateAsync();
  }, [segments, incidents, fleet, showFleet, showIncidents, showHeatmap, enableClustering, showStateBoundaries, geoJsonData, mapLoaded]);

  // Load GeoJSON boundaries
  const loadGeoJsonBoundaries = async () => {
    try {
      const response = await fetch('/geojson/northeast-india-states.geojson');
      const data = await response.json();
      setGeoJsonData(data);
    } catch (err) {
      console.warn('Could not load GeoJSON boundaries:', err);
    }
  };

  // Render state boundaries
  const renderStateBoundaries = (L, map) => {
    if (!showStateBoundaries || !geoJsonData) return;
    
    // Remove existing boundary layer
    if (boundaryLayerRef.current) {
      map.removeLayer(boundaryLayerRef.current);
    }

    // Style function for state boundaries
    const stateStyle = (feature) => ({
      fillColor: 'rgba(0, 212, 255, 0.05)',
      weight: 2,
      opacity: 0.6,
      color: 'rgba(0, 212, 255, 0.4)',
      fillOpacity: 0.1,
    });

    // Hover style
    const highlightStyle = {
      weight: 3,
      opacity: 1,
      color: '#00D4FF',
      fillOpacity: 0.2,
    };

    // Create GeoJSON layer
    const geoJsonLayer = L.geoJSON(geoJsonData, {
      style: stateStyle,
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        
        // Hover effects
        layer.on({
          mouseover: (e) => {
            const layer = e.target;
            layer.setStyle(highlightStyle);
            layer.bringToFront();
          },
          mouseout: (e) => {
            geoJsonLayer.resetStyle(e.target);
          },
          click: (e) => {
            if (onStateClick) {
              onStateClick(props);
            }
            // Show popup with state info
            const popup = L.popup()
              .setLatLng(e.latlng)
              .setContent(`
                <div style="font-family: Inter, sans-serif; min-width: 180px;">
                  <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: #00D4FF;">
                    ${props.name}
                  </div>
                  <table style="font-size: 12px; width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 3px 0; color: #888;">Capital</td><td style="text-align: right; font-weight: 500;">${props.capital}</td></tr>
                    <tr><td style="padding: 3px 0; color: #888;">Population</td><td style="text-align: right; font-weight: 500;">${(props.population / 1000000).toFixed(2)}M</td></tr>
                    <tr><td style="padding: 3px 0; color: #888;">Area</td><td style="text-align: right; font-weight: 500;">${props.area_km2.toLocaleString()} km²</td></tr>
                    <tr><td style="padding: 3px 0; color: #888;">Code</td><td style="text-align: right; font-weight: 600; color: #00D4FF;">${props.state_code}</td></tr>
                  </table>
                </div>
              `)
              .openOn(map);
          }
        });

        // Add state name tooltip
        layer.bindTooltip(props.name, {
          permanent: false,
          direction: 'center',
          className: 'state-boundary-tooltip'
        });
      }
    }).addTo(map);

    boundaryLayerRef.current = geoJsonLayer;
    layersRef.current.push(geoJsonLayer);
  };

  function updateLayers(L, map) {
    // Clear old layers
    layersRef.current.forEach(layer => map.removeLayer(layer));
    layersRef.current = [];

    // --- Draw State Boundaries First (as base layer) ---
    renderStateBoundaries(L, map);

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
        className: seg.is_blocked ? 'blocked-road-segment' : '',
      }).addTo(map);

      // Add click handler if provided
      if (onSegmentClick) {
        line.on('click', () => onSegmentClick(seg));
      }

      // Animate blocked segments
      if (seg.is_blocked) {
        let offset = 0;
        setInterval(() => {
          offset = (offset + 1) % 20;
          line.setStyle({ dashOffset: -offset });
        }, 100);
      }

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
          html: `<div class="incident-marker-wrapper ${inc.severity}" style="
            position: relative;
          ">
            <div class="incident-pulse" style="
              position: absolute;
              width: 40px; height: 40px;
              border-radius: 50%;
              background: ${color}40;
              top: 50%; left: 50%;
              transform: translate(-50%, -50%);
              animation: pulse-wave 2s ease-out infinite;
            "></div>
            <div style="
              position: relative;
              width: 24px; height: 24px; border-radius: 50%;
              background: ${color}; border: 2px solid #fff;
              display: flex; align-items: center; justify-content: center;
              font-size: 12px; color: #fff; font-weight: bold;
              box-shadow: 0 0 15px ${color}80;
              z-index: 10;
            ">⚠</div>
          </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([inc.latitude, inc.longitude], { icon }).addTo(map);

        // Add click handler if provided
        if (onIncidentClick) {
          marker.on('click', () => onIncidentClick(inc));
        }

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
          html: `<div class="fleet-marker-wrapper" style="
            position: relative;
          ">
            <div class="fleet-trail" style="
              position: absolute;
              width: 50px; height: 4px;
              background: linear-gradient(90deg, transparent, ${statusColor}60, transparent);
              top: 50%; left: -25px;
              transform: translateY(-50%);
              animation: trail-move 1.5s ease-in-out infinite;
            "></div>
            <div style="
              position: relative;
              width: 28px; height: 28px; border-radius: 6px;
              background: ${statusColor}; border: 2px solid #fff;
              display: flex; align-items: center; justify-content: center;
              font-size: 14px; color: #000; font-weight: bold;
              box-shadow: 0 0 15px ${statusColor}80;
              transform: rotate(-20deg);
              z-index: 10;
            ">🚛</div>
          </div>`,
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
