import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox access token from environment variable
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA';

const Map = ({ balloons, storms, selectedTime, monitoringBalloons }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-95.7129, 37.0902], // Center of US
        zoom: 4
      });

      // Add navigation control
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('error', (e) => {
        console.warn('Map error:', e);
      });

      map.current.on('load', () => {
        console.log('Map loaded successfully');
      });

    } catch (error) {
      console.error('Failed to initialize map:', error);
    }

  }, []);

  // Effect to update map data when balloons or storms change
  useEffect(() => {
    if (!map.current || !balloons || !storms) {
      console.log('Map effect skipped:', {
        mapReady: !!map.current,
        balloonsReady: !!balloons,
        stormsReady: !!storms
      });
      return;
    }

    console.log('Updating map with data:', {
      balloonCount: Object.keys(balloons).length,
      stormCount: storms.length,
      monitoringCount: monitoringBalloons?.length || 0
    });

    // Clear existing pulse animation
    if (map.current._pulseInterval) {
      clearInterval(map.current._pulseInterval);
      map.current._pulseInterval = null;
    }

    // Clear existing sources and layers
    if (map.current.getSource('balloons')) {
      map.current.removeLayer('balloon-trajectories');
      map.current.removeLayer('balloon-points');
      map.current.removeSource('balloons');
    }

    if (map.current.getSource('balloon-points')) {
      map.current.removeSource('balloon-points');
    }

    if (map.current.getSource('storms')) {
      map.current.removeLayer('storm-cones');
      map.current.removeLayer('storm-centers');
      map.current.removeSource('storms');
    }

    if (map.current.getSource('storm-centers')) {
      map.current.removeSource('storm-centers');
    }

    // Add balloon data
    const balloonFeatures = [];
    const balloonPoints = [];

    Object.entries(balloons).forEach(([id, balloon]) => {
      if (!balloon.trajectory || balloon.trajectory.length === 0) {
        console.warn(`Balloon ${id} has no trajectory data`);
        return;
      }

      const isMonitoring = monitoringBalloons && monitoringBalloons.includes(id);

      try {
        // Create trajectory line
        const trajectory = balloon.trajectory.map(point => [point.lon, point.lat]);
        balloonFeatures.push({
          type: 'Feature',
          properties: {
            id: id,
            type: 'trajectory',
            isMonitoring: isMonitoring
          },
          geometry: {
            type: 'LineString',
            coordinates: trajectory
          }
        });

        // Create current position point
        const currentPosition = balloon.trajectory[balloon.trajectory.length - 1];
        balloonPoints.push({
          type: 'Feature',
          properties: {
            id: id,
            altitude: currentPosition.alt,
            timestamp: currentPosition.timestamp,
            type: 'current-position',
            isMonitoring: isMonitoring
          },
          geometry: {
            type: 'Point',
            coordinates: [currentPosition.lon, currentPosition.lat]
          }
        });
      } catch (error) {
        console.error(`Error processing balloon ${id}:`, error);
      }
    });

    // Add balloon source
    map.current.addSource('balloons', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: balloonFeatures
      }
    });

    map.current.addSource('balloon-points', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: balloonPoints
      }
    });

    // Add balloon trajectory layer with conditional styling
    try {
      map.current.addLayer({
        id: 'balloon-trajectories',
        type: 'line',
        source: 'balloons',
        paint: {
          'line-color': [
            'case',
            ['get', 'isMonitoring'],
            '#ff4444', // Red for monitoring balloons
            '#00ffff'  // Cyan for regular balloons
          ],
          'line-width': [
            'case',
            ['get', 'isMonitoring'],
            4, // Thicker for monitoring balloons
            2  // Regular thickness
          ],
          'line-opacity': 0.8
        }
      });
    } catch (error) {
      console.error('Error adding balloon trajectory layer:', error);
    }

    // Add balloon points layer with conditional styling
    try {
      map.current.addLayer({
        id: 'balloon-points',
        type: 'circle',
        source: 'balloon-points',
        paint: {
          'circle-color': [
            'case',
            ['get', 'isMonitoring'],
            '#ff4444', // Red for monitoring balloons
            '#00ffff'  // Cyan for regular balloons
          ],
          'circle-radius': [
            'case',
            ['get', 'isMonitoring'],
            12, // Larger for monitoring balloons
            8   // Regular size
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.9
        }
      });
    } catch (error) {
      console.error('Error adding balloon points layer:', error);
    }

    // Add simple pulsating animation for monitoring balloons
    let pulseDirection = 1;
    let pulseSize = 12;

    const animatePulse = () => {
      pulseSize += pulseDirection * 0.5;
      if (pulseSize >= 15) pulseDirection = -1;
      if (pulseSize <= 10) pulseDirection = 1;

      if (map.current.getLayer('balloon-points')) {
        map.current.setPaintProperty('balloon-points', 'circle-radius', [
          'case',
          ['get', 'isMonitoring'],
          pulseSize, // Pulsating size for monitoring balloons
          8   // Regular size for normal balloons
        ]);
      }
    };

    // Start pulse animation
    const pulseInterval = setInterval(animatePulse, 150);

    // Store interval reference for cleanup
    map.current._pulseInterval = pulseInterval;

    // Add storm data
    const stormFeatures = [];
    const stormCenters = [];

    storms.forEach(storm => {
      if (storm.geometry) {
        stormFeatures.push({
          type: 'Feature',
          properties: {
            id: storm.id,
            headline: storm.properties.headline,
            severity: storm.properties.severity,
            event: storm.properties.event
          },
          geometry: storm.geometry
        });
      }

      // For storm centers, we'll use the centroid of the geometry
      if (storm.geometry && storm.geometry.coordinates) {
        const coords = storm.geometry.coordinates[0][0];
        const centerLon = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length;
        const centerLat = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length;

        stormCenters.push({
          type: 'Feature',
          properties: {
            id: storm.id,
            headline: storm.properties.headline,
            description: storm.properties.description,
            severity: storm.properties.severity,
            event: storm.properties.event
          },
          geometry: {
            type: 'Point',
            coordinates: [centerLon, centerLat]
          }
        });
      }
    });

    // Add storm sources
    map.current.addSource('storms', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: stormFeatures
      }
    });

    map.current.addSource('storm-centers', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: stormCenters
      }
    });

    // Add storm cone layer
    map.current.addLayer({
      id: 'storm-cones',
      type: 'fill',
      source: 'storms',
      paint: {
        'fill-color': '#ff0000',
        'fill-opacity': 0.3
      }
    });

    // Add storm center layer
    map.current.addLayer({
      id: 'storm-centers',
      type: 'circle',
      source: 'storm-centers',
      paint: {
        'circle-color': '#ff0000',
        'circle-radius': 12,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2
      }
    });

    // Add hover effect for balloon trajectories
    map.current.on('mouseenter', 'balloon-trajectories', () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'balloon-trajectories', () => {
      map.current.getCanvas().style.cursor = '';
    });

    // Add hover tooltip for balloon trajectories
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false
    });

    map.current.on('mouseenter', 'balloon-trajectories', (e) => {
      const coordinates = e.lngLat;
      const properties = e.features[0].properties;

      popup.setLngLat(coordinates)
        .setHTML(`
          <div>
            <strong>Balloon ${properties.id}</strong>
            ${properties.isMonitoring ? '<br><span style="color: #ff4444;">🎯 Monitoring Storm</span>' : ''}
          </div>
        `)
        .addTo(map.current);
    });

    map.current.on('mouseleave', 'balloon-trajectories', () => {
      popup.remove();
    });

    // Add hover effect for balloon points
    map.current.on('mouseenter', 'balloon-points', (e) => {
      const coordinates = e.lngLat;
      const properties = e.features[0].properties;

      popup.setLngLat(coordinates)
        .setHTML(`
          <div>
            <strong>Balloon ${properties.id}</strong>
            <br>Altitude: ${Math.round(properties.altitude)}m
            ${properties.isMonitoring ? '<br><span style="color: #ff4444;">🎯 Monitoring Storm</span>' : ''}
          </div>
        `)
        .addTo(map.current);
    });

    map.current.on('mouseleave', 'balloon-points', () => {
      popup.remove();
    });

    // Add click popup for storm centers
    map.current.on('click', 'storm-centers', (e) => {
      const coordinates = e.lngLat;
      const properties = e.features[0].properties;

      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div>
            <h3>${properties.event}</h3>
            <p><strong>Severity:</strong> ${properties.severity || 'N/A'}</p>
            <p><strong>Headline:</strong> ${properties.headline}</p>
            <p>${properties.description}</p>
          </div>
        `)
        .addTo(map.current);
    });

    // Return cleanup function
    return () => {
      if (map.current && map.current._pulseInterval) {
        clearInterval(map.current._pulseInterval);
        map.current._pulseInterval = null;
      }
    };

  }, [balloons, storms, monitoringBalloons]);

  return (
    <div
      ref={mapContainer}
      className="map-container"
      style={{
        width: '100%',
        height: '100vh'
      }}
    />
  );
};

export default Map;