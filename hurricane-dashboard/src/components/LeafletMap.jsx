import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import * as turf from '@turf/turf';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LeafletMap.css';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map updates
const MapUpdater = ({ balloons, storms, monitoringBalloons }) => {
  const map = useMap();

  useEffect(() => {
    // Only fit bounds once when data first loads, then let user control the view
    if (balloons && storms && Object.keys(balloons).length > 0 && storms.length > 0) {
      // Just ensure the map is focused on the Gulf region without restrictive bounds
      const center = [29.0, -85.0];
      map.setView(center, 5);
    }
  }, []); // Empty dependency array so it only runs once

  return null;
};

// Enhanced balloon marker component
const BalloonMarker = ({ position, isMonitoring, balloonId, altitude }) => {
  const [pulseSize, setPulseSize] = useState(5);

  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      setPulseSize(prev => {
        if (prev >= 7) return 5;
        return prev + 0.4;
      });
    }, 1000); // Slower, more dramatic pulsing for monitoring balloons

    return () => clearInterval(interval);
  }, [isMonitoring]);

  if (isMonitoring) {
    // Monitoring balloons: Double-ring design with warning colors
    return (
      <>
        {/* Outer warning ring */}
        <CircleMarker
          center={position}
          radius={pulseSize + 2}
          pathOptions={{
            fillColor: 'transparent',
            color: '#ff6b00', // Orange warning ring
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0,
            dashArray: '5, 5' // Dashed outline for distinction
          }}
        />
        {/* Inner balloon core */}
        <CircleMarker
          center={position}
          radius={pulseSize}
          pathOptions={{
            fillColor: '#0088ff', // Bright blue to stay balloon-like
            color: '#ffffff',     // White border to stand out
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          }}
        >
          <Popup>
            <div>
              <strong>🎈 Balloon {balloonId}</strong>
              <br />Altitude: {Math.round(altitude)}m
              <br />
              <span style={{ color: '#ff6b00', fontWeight: 'bold' }}>⚠️ MONITORING STORM</span>
            </div>
          </Popup>
        </CircleMarker>
      </>
    );
  } else {
    // Regular balloons: Simple design
    return (
      <CircleMarker
        center={position}
        radius={4}
        pathOptions={{
          fillColor: '#0066cc', // Standard blue
          color: '#ffffff',     // White border
          weight: 1.5,
          opacity: 0.8,
          fillOpacity: 0.7
        }}
      >
        <Popup>
          <div>
            <strong>🎈 Balloon {balloonId}</strong>
            <br />Altitude: {Math.round(altitude)}m
          </div>
        </Popup>
      </CircleMarker>
    );
  }
};

const LeafletMap = ({ balloons, storms, selectedTime, monitoringBalloons }) => {

  // Memoize the processed data to prevent unnecessary re-processing
  const processedData = useMemo(() => {
    if (!balloons || !storms) return {
      balloonTrajectories: [],
      balloonPositions: [],
      stormPolygons: [],
      stormCenters: []
    };

    console.log('Processing data for Leaflet map:', {
      balloonCount: Object.keys(balloons).length,
      stormCount: storms.length,
      monitoringCount: monitoringBalloons?.length || 0
    });

    const trajectories = [];
    const positions = [];
    const stormPolys = [];
    const stormCents = [];

    // Process balloons
    Object.entries(balloons).forEach(([id, balloon]) => {
      if (!balloon.trajectory || balloon.trajectory.length === 0) return;

      const isMonitoring = monitoringBalloons && monitoringBalloons.includes(id);

      // Create trajectory - sample every few points for better performance
      const pathCoords = balloon.trajectory
        .filter((_, index) => index % 2 === 0) // Sample every other point
        .map(point => [point.lat, point.lon]);

      trajectories.push({
        id,
        positions: pathCoords,
        color: isMonitoring ? '#ff6b00' : '#0066cc', // Orange for monitoring, blue for regular
        weight: isMonitoring ? 2 : 1,
        opacity: isMonitoring ? 0.7 : 0.4,
        dashArray: isMonitoring ? '8, 4' : undefined, // Dashed line for monitoring balloons
        isMonitoring
      });

      // Current position
      const currentPos = balloon.trajectory[balloon.trajectory.length - 1];
      positions.push({
        id,
        position: [currentPos.lat, currentPos.lon],
        altitude: currentPos.alt,
        isMonitoring
      });
    });

    // Process storms
    storms.forEach(storm => {
      if (storm.geometry && storm.geometry.coordinates) {
        const coords = storm.geometry.coordinates[0].map(coord => [coord[1], coord[0]]); // lat, lon
        stormPolys.push({
          id: storm.id,
          positions: coords,
          properties: storm.properties
        });

        // Calculate centroid for storm center
        try {
          const polygon = turf.polygon(storm.geometry.coordinates);
          const centroid = turf.centroid(polygon);
          stormCents.push({
            id: storm.id,
            position: [centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]],
            properties: storm.properties
          });
        } catch (error) {
          console.warn('Error calculating storm centroid:', error);
        }
      }
    });

    return {
      balloonTrajectories: trajectories,
      balloonPositions: positions,
      stormPolygons: stormPolys,
      stormCenters: stormCents
    };
  }, [balloons, storms, monitoringBalloons]);

  if (!balloons || !storms) {
    return (
      <div className="map-loading">
        <div>Loading map data...</div>
      </div>
    );
  }

  return (
    <div className="leaflet-map-container">
      <MapContainer
        center={[29.0, -85.0]}
        zoom={5}
        style={{ height: '100vh', width: '100%' }}
        zoomControl={true}
        attributionControl={false}
        worldCopyJump={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={true}
        />

        <MapUpdater
          balloons={balloons}
          storms={storms}
          monitoringBalloons={monitoringBalloons}
        />

        {/* Storm polygons */}
        {processedData.stormPolygons.map(storm => (
          <Polygon
            key={storm.id}
            positions={storm.positions}
            pathOptions={{
              fillColor: '#ff3333',
              fillOpacity: 0.15,
              color: '#ff4d4d',
              weight: 1.5,
              opacity: 0.7
            }}
          />
        ))}

        {/* Storm centers */}
        {processedData.stormCenters.map(storm => (
          <CircleMarker
            key={storm.id}
            center={storm.position}
            radius={8}
            pathOptions={{
              fillColor: '#ff3333',
              color: '#333333',
              weight: 1.5,
              opacity: 0.8,
              fillOpacity: 0.7
            }}
          >
            <Popup>
              <div>
                <h3>{storm.properties.event}</h3>
                <p><strong>Severity:</strong> {storm.properties.severity || 'N/A'}</p>
                <p><strong>Headline:</strong> {storm.properties.headline}</p>
                <p>{storm.properties.description}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Balloon trajectories */}
        {processedData.balloonTrajectories.map(trajectory => (
          <Polyline
            key={trajectory.id}
            positions={trajectory.positions}
            pathOptions={{
              color: trajectory.color,
              weight: trajectory.weight,
              opacity: trajectory.opacity,
              dashArray: trajectory.dashArray
            }}
          >
            <Popup>
              <div>
                <strong>Balloon {trajectory.id}</strong>
                {trajectory.isMonitoring && (
                  <>
                    <br />
                    <span style={{ color: '#ff6b00', fontWeight: 'bold' }}>⚠️ MONITORING STORM</span>
                  </>
                )}
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Balloon current positions */}
        {processedData.balloonPositions.map(balloon => (
          <BalloonMarker
            key={balloon.id}
            position={balloon.position}
            isMonitoring={balloon.isMonitoring}
            balloonId={balloon.id}
            altitude={balloon.altitude}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default LeafletMap;