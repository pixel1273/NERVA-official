import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  NODE_COORDS, 
  STATE_LABELS, 
  SEVERITY_COLORS, 
  STATUS_COLORS, 
  getRiskColor, 
  getRiskLabel 
} from './NERMap';
import './NERMap.css'; // Reuse styles

// Bounding box for North East India (restricts map panning)
const NE_BOUNDS = [
  [87.5, 21.5],  // South-West corner (lng, lat for MapLibre)
  [97.5, 29.5],  // North-East corner
];

export function TerrainMap({
  segments = [],
  incidents = [],
  fleet = [],
  height = '500px',
  showFleet = false,
  showIncidents = true,
  showStateBoundaries = true,
  onSegmentClick = null,
  onIncidentClick = null,
  onStateClick = null
}) {
  const mapContainer = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [geoJsonData, setGeoJsonData] = useState(null);

  // Initialize MapLibre
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const useBhuvan = import.meta.env.VITE_USE_BHUVAN !== 'false';

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'satellite-tiles': {
            type: 'raster',
            tiles: useBhuvan ? [
              'https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/wms/?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/jpeg&TRANSPARENT=false&LAYERS=india3&WIDTH=256&HEIGHT=256&SRS=EPSG:3857&BBOX={bbox-epsg-3857}'
            ] : [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: 'Map data © ISRO Bhuvan'
          },
          'terrain-source': {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 15
          }
        },
        layers: [
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite-tiles',
            minzoom: 0,
            maxzoom: 22
          }
        ],
        terrain: {
          source: 'terrain-source',
          exaggeration: 1.5
        }
      },
      center: [92.5, 25.5], // lng, lat
      zoom: 7,
      pitch: 60,
      bearing: 0,
      maxBounds: NE_BOUNDS,
      minZoom: 6,
      maxZoom: 18,
    });

    map.addControl(new maplibregl.NavigationControl({
      visualizePitch: true,
    }));
    
    map.addControl(new maplibregl.TerrainControl({
      source: 'terrain-source',
      exaggeration: 1.5
    }));

    map.on('load', () => {
      mapInstanceRef.current = map;
      setMapLoaded(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Fetch GeoJSON boundaries
  useEffect(() => {
    fetch('/geojson/northeast-india-states.geojson')
      .then(r => r.json())
      .then(data => setGeoJsonData(data))
      .catch(e => console.warn('Could not load GeoJSON boundaries:', e));
  }, []);

  // Update data layers when props change or map loads
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Ensure sources exist before updating them
    // State boundaries
    if (showStateBoundaries && geoJsonData) {
      if (!map.getSource('state-boundaries')) {
        map.addSource('state-boundaries', { type: 'geojson', data: geoJsonData });
        map.addLayer({
          id: 'state-boundaries-fill',
          type: 'fill',
          source: 'state-boundaries',
          paint: {
            'fill-color': 'rgba(0, 212, 255, 0.05)',
            'fill-outline-color': 'rgba(0, 212, 255, 0.4)'
          }
        });
        map.addLayer({
          id: 'state-boundaries-line',
          type: 'line',
          source: 'state-boundaries',
          paint: {
            'line-color': 'rgba(0, 212, 255, 0.4)',
            'line-width': 2
          }
        });
      } else {
        map.getSource('state-boundaries').setData(geoJsonData);
      }
    } else if (map.getSource('state-boundaries')) {
      if (map.getLayer('state-boundaries-fill')) map.removeLayer('state-boundaries-fill');
      if (map.getLayer('state-boundaries-line')) map.removeLayer('state-boundaries-line');
      map.removeSource('state-boundaries');
    }

    // Road Segments
    const routesFeatureCollection = {
      type: 'FeatureCollection',
      features: segments.map(seg => {
        const fromCoord = NODE_COORDS[seg.u];
        const toCoord = NODE_COORDS[seg.v];
        if (!fromCoord || !toCoord) return null;
        
        return {
          type: 'Feature',
          properties: {
            ...seg,
            color: getRiskColor(seg),
            weight: seg.is_blocked ? 5 : 3
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [fromCoord[1], fromCoord[0]], // lng, lat
              [toCoord[1], toCoord[0]]
            ]
          }
        };
      }).filter(Boolean)
    };

    if (!map.getSource('routes')) {
      map.addSource('routes', { type: 'geojson', data: routesFeatureCollection });
      map.addLayer({
        id: 'routes-layer',
        type: 'line',
        source: 'routes',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'weight'],
          'line-opacity': 0.85
        }
      });
      // Add click handler for routes if needed
      if (onSegmentClick) {
        map.on('click', 'routes-layer', (e) => {
          if (e.features.length > 0) {
            onSegmentClick(e.features[0].properties);
          }
        });
        map.on('mouseenter', 'routes-layer', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'routes-layer', () => {
          map.getCanvas().style.cursor = '';
        });
      }
    } else {
      map.getSource('routes').setData(routesFeatureCollection);
    }

    // Node Markers
    Object.entries(NODE_COORDS).forEach(([name, coords]) => {
      const el = document.createElement('div');
      el.className = 'ner-tooltip';
      el.style.backgroundColor = '#00FF66';
      el.style.width = '8px';
      el.style.height = '8px';
      el.style.borderRadius = '50%';
      el.style.border = '1px solid black';
      
      const label = document.createElement('span');
      label.textContent = name;
      label.style.marginLeft = '12px';
      label.style.color = '#fff';
      label.style.textShadow = '0 0 4px #000';
      label.style.fontSize = '12px';
      el.appendChild(label);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([coords[1], coords[0]]) // lng, lat
        .addTo(map);
      markersRef.current.push(marker);
    });

    // Incident Markers
    if (showIncidents) {
      incidents.forEach(inc => {
        if (!inc.latitude || !inc.longitude) return;
        const color = SEVERITY_COLORS[inc.severity] || SEVERITY_COLORS.medium;
        
        const el = document.createElement('div');
        el.className = 'incident-marker';
        el.innerHTML = `<div class="incident-marker-wrapper ${inc.severity}" style="position: relative;">
          <div class="incident-pulse" style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: ${color}40; top: 50%; left: 50%; transform: translate(-50%, -50%); animation: pulse-wave 2s ease-out infinite;"></div>
          <div style="position: relative; width: 24px; height: 24px; border-radius: 50%; background: ${color}; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #fff; font-weight: bold; box-shadow: 0 0 15px ${color}80; z-index: 10;">⚠</div>
        </div>`;

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="font-family: Inter, sans-serif; min-width: 200px; color: #000;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${inc.title}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${inc.location_name || ''} • ${inc.district || ''}, ${inc.state || ''}</div>
            <div style="font-size: 12px; margin-bottom: 6px;">${inc.description || ''}</div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([inc.longitude, inc.latitude])
          .setPopup(popup)
          .addTo(map);

        if (onIncidentClick) {
          el.addEventListener('click', () => onIncidentClick(inc));
        }

        markersRef.current.push(marker);
      });
    }

    // Fleet markers
    if (showFleet) {
      fleet.forEach(v => {
        if (!v.current_lat || !v.current_lng) return;
        const statusColor = STATUS_COLORS[v.status] || STATUS_COLORS.in_transit;
        
        const el = document.createElement('div');
        el.className = 'fleet-marker';
        el.innerHTML = `<div class="fleet-marker-wrapper" style="position: relative;">
          <div class="fleet-trail" style="position: absolute; width: 50px; height: 4px; background: linear-gradient(90deg, transparent, ${statusColor}60, transparent); top: 50%; left: -25px; transform: translateY(-50%); animation: trail-move 1.5s ease-in-out infinite;"></div>
          <div style="position: relative; width: 28px; height: 28px; border-radius: 6px; background: ${statusColor}; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #000; font-weight: bold; box-shadow: 0 0 15px ${statusColor}80; transform: rotate(-20deg); z-index: 10;">🚛</div>
        </div>`;

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="font-family: Inter, sans-serif; min-width: 200px; color: #000;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${v.vehicle_id}</div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([v.current_lng, v.current_lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

  }, [segments, incidents, fleet, showFleet, showIncidents, showStateBoundaries, geoJsonData, mapLoaded]);

  return (
    <div className="ner-map-container" style={{ height }}>
      <div ref={mapContainer} className="ner-map" style={{ height: '100%', width: '100%' }} />
      <div className="map-legend">
        <div className="legend-title">Road Status</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#10B981' }}></span> Low Risk</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#F59E0B' }}></span> Moderate</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#EF4444' }}></span> High Risk / Blocked</div>
      </div>
    </div>
  );
}
