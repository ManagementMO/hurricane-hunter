import { useRef, useEffect, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

const MapComponent = ({
  balloons,
  storms,
  selectedBalloon,
  onBalloonSelect,
  onCenterChange,
  isLoading
}) => {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const balloonMarkers = useRef([])
  const [mapError, setMapError] = useState(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  const isTokenValid = mapboxgl.accessToken &&
    !mapboxgl.accessToken.includes('example') &&
    mapboxgl.accessToken !== 'undefined' &&
    mapboxgl.accessToken.length >= 50

  const initializeMapLayers = useCallback(() => {
    if (!map.current) return

    try {
      // Load custom icons
      map.current.loadImage(
        'data:image/svg+xml;base64,' + btoa(`
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#e74c3c" stroke="#fff" stroke-width="3"/>
            <path d="M16 4 L16 28 M4 16 L28 16" stroke="#fff" stroke-width="3"/>
            <circle cx="16" cy="16" r="4" fill="#fff"/>
          </svg>
        `),
        'hurricane-icon'
      )

      // Add data sources
      map.current.addSource('balloon-trajectories', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      map.current.addSource('storm-centers', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      map.current.addSource('storm-areas', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      // Add layers
      map.current.addLayer({
        id: 'storm-areas',
        type: 'fill',
        source: 'storm-areas',
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'severity'], 'Extreme'], '#8b0000',
            ['==', ['get', 'severity'], 'Severe'], '#e74c3c',
            ['==', ['get', 'severity'], 'Moderate'], '#f39c12',
            '#3498db'
          ],
          'fill-opacity': 0.15,
          'fill-outline-color': [
            'case',
            ['==', ['get', 'severity'], 'Extreme'], '#8b0000',
            ['==', ['get', 'severity'], 'Severe'], '#e74c3c',
            ['==', ['get', 'severity'], 'Moderate'], '#f39c12',
            '#3498db'
          ]
        }
      })

      map.current.addLayer({
        id: 'balloon-trajectories',
        type: 'line',
        source: 'balloon-trajectories',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'selected'], true], '#00ff88',
            '#00cffc'
          ],
          'line-width': [
            'case',
            ['==', ['get', 'selected'], true], 4,
            2
          ],
          'line-opacity': [
            'case',
            ['==', ['get', 'selected'], true], 1,
            0.7
          ]
        }
      })

      map.current.addLayer({
        id: 'storm-centers',
        type: 'symbol',
        source: 'storm-centers',
        layout: {
          'icon-image': 'hurricane-icon',
          'icon-allow-overlap': true,
          'icon-size': [
            'case',
            ['==', ['get', 'severity'], 'Extreme'], 1.2,
            ['==', ['get', 'severity'], 'Severe'], 1.0,
            0.8
          ],
          'text-field': ['get', 'event'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 2,
          'text-offset': [0, 2],
          'text-anchor': 'top'
        }
      })

      addInteractivity()
      console.log('Map layers initialized successfully')
    } catch (error) {
      console.error('Error initializing map layers:', error)
      setMapError('Failed to initialize map layers')
    }
  }, [])

  useEffect(() => {
    if (!isTokenValid || map.current) return

    if (!mapContainer.current) return

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-95, 35],
        zoom: 4,
        attributionControl: false,
        logoPosition: 'bottom-right',
        preserveDrawingBuffer: true
      })

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
      map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left')

      map.current.on('load', () => {
        setIsMapLoaded(true)
        initializeMapLayers()
      })

      map.current.on('move', () => {
        if (onCenterChange) {
          const center = map.current.getCenter()
          onCenterChange([center.lng, center.lat])
        }
      })

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e)
        setMapError(e.error?.message || 'Map failed to load')
      })

      setTimeout(() => {
        if (map.current) {
          map.current.resize()
        }
      }, 100)

    } catch (error) {
      console.error('Error creating map:', error)
      setMapError(error.message)
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
        setIsMapLoaded(false)
      }
    }
  }, [isTokenValid, initializeMapLayers, onCenterChange])

  const updateMapData = useCallback(() => {
    if (!isMapLoaded || !map.current) return

    // Clear existing balloon markers
    balloonMarkers.current.forEach(marker => marker.remove())
    balloonMarkers.current = []

    if (balloons) {
      // Transform balloons to GeoJSON trajectories
      const balloonFeatures = Object.values(balloons).map(balloon => {
        const coordinates = balloon.trajectory.map(point => [point.lon, point.lat])
        const latestPoint = balloon.trajectory[balloon.trajectory.length - 1]
        const isSelected = selectedBalloon === balloon.id

        return {
          type: 'Feature',
          properties: {
            balloonId: balloon.id,
            latestAlt: latestPoint.alt,
            trajectoryLength: balloon.trajectory.length,
            selected: isSelected
          },
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        }
      })

      map.current.getSource('balloon-trajectories').setData({
        type: 'FeatureCollection',
        features: balloonFeatures
      })

      // Add enhanced markers for latest balloon positions
      Object.values(balloons).forEach(balloon => {
        const latestPoint = balloon.trajectory[balloon.trajectory.length - 1]
        const isSelected = selectedBalloon === balloon.id

        const markerElement = document.createElement('div')
        markerElement.className = `balloon-marker ${isSelected ? 'selected' : ''}`
        markerElement.innerHTML = `
          <div class="marker-dot ${isSelected ? 'selected' : ''}"></div>
          <div class="marker-label">B${balloon.id}</div>
        `

        markerElement.addEventListener('click', () => {
          onBalloonSelect(balloon.id)
        })

        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([latestPoint.lon, latestPoint.lat])
          .addTo(map.current)

        balloonMarkers.current.push(marker)
      })

      // Fly to selected balloon if any
      if (selectedBalloon && balloons[selectedBalloon]) {
        const latestPoint = balloons[selectedBalloon].trajectory[balloons[selectedBalloon].trajectory.length - 1]
        map.current.flyTo({
          center: [latestPoint.lon, latestPoint.lat],
          zoom: 8,
          duration: 2000
        })
      }
    }

    if (storms) {
      // Transform storms to GeoJSON
      const stormCenterFeatures = storms.map(storm => ({
        type: 'Feature',
        properties: {
          id: storm.id,
          event: storm.properties.event,
          headline: storm.properties.headline,
          description: storm.properties.description,
          severity: storm.properties.severity,
          urgency: storm.properties.urgency,
          areaDesc: storm.properties.area_desc
        },
        geometry: {
          type: 'Point',
          coordinates: getStormCenter(storm)
        }
      }))

      const stormAreaFeatures = storms
        .filter(storm => storm.geometry && storm.geometry.coordinates.length > 0)
        .map(storm => ({
          type: 'Feature',
          properties: {
            id: storm.id,
            event: storm.properties.event,
            severity: storm.properties.severity
          },
          geometry: storm.geometry
        }))

      map.current.getSource('storm-centers').setData({
        type: 'FeatureCollection',
        features: stormCenterFeatures
      })

      map.current.getSource('storm-areas').setData({
        type: 'FeatureCollection',
        features: stormAreaFeatures
      })
    }
  }, [balloons, storms, selectedBalloon, isMapLoaded, onBalloonSelect])

  useEffect(() => {
    updateMapData()
  }, [updateMapData])

  const getStormCenter = (storm) => {
    if (!storm.geometry || !storm.geometry.coordinates || storm.geometry.coordinates.length === 0) {
      return [-95, 35]
    }

    const coords = storm.geometry.coordinates[0]
    if (Array.isArray(coords) && coords.length > 0) {
      const lngs = coords.map(c => c[0])
      const lats = coords.map(c => c[1])
      const centerLng = lngs.reduce((a, b) => a + b) / lngs.length
      const centerLat = lats.reduce((a, b) => a + b) / lats.length
      return [centerLng, centerLat]
    }

    return [-95, 35]
  }

  const addInteractivity = () => {
    // Balloon trajectory hover
    map.current.on('mouseenter', 'balloon-trajectories', (e) => {
      map.current.getCanvas().style.cursor = 'pointer'

      const feature = e.features[0]
      const coordinates = e.lngLat

      const popup = new mapboxgl.Popup({ closeButton: false })
        .setLngLat(coordinates)
        .setHTML(`
          <div class="map-popup balloon-popup">
            <h4>Balloon ${feature.properties.balloonId}</h4>
            <p>Current Altitude: ${feature.properties.latestAlt.toFixed(1)}m</p>
            <p>Trajectory Points: ${feature.properties.trajectoryLength}</p>
            <p class="popup-action">Click to select</p>
          </div>
        `)
        .addTo(map.current)

      map.current._balloonPopup = popup
    })

    map.current.on('mouseleave', 'balloon-trajectories', () => {
      map.current.getCanvas().style.cursor = ''
      if (map.current._balloonPopup) {
        map.current._balloonPopup.remove()
        map.current._balloonPopup = null
      }
    })

    map.current.on('click', 'balloon-trajectories', (e) => {
      const feature = e.features[0]
      onBalloonSelect(feature.properties.balloonId)
    })

    // Storm center interactions
    map.current.on('click', 'storm-centers', (e) => {
      const feature = e.features[0]
      const coordinates = e.lngLat

      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div class="map-popup storm-popup">
            <h3>${feature.properties.event}</h3>
            <p><strong>Headline:</strong> ${feature.properties.headline || 'N/A'}</p>
            <p><strong>Severity:</strong> <span class="severity-${feature.properties.severity?.toLowerCase()}">${feature.properties.severity || 'N/A'}</span></p>
            <p><strong>Urgency:</strong> ${feature.properties.urgency || 'N/A'}</p>
            <p><strong>Area:</strong> ${feature.properties.areaDesc || 'N/A'}</p>
            ${feature.properties.description ? `<p><strong>Details:</strong> ${feature.properties.description.substring(0, 200)}...</p>` : ''}
          </div>
        `)
        .addTo(map.current)
    })

    map.current.on('mouseenter', 'storm-centers', () => {
      map.current.getCanvas().style.cursor = 'pointer'
    })

    map.current.on('mouseleave', 'storm-centers', () => {
      map.current.getCanvas().style.cursor = ''
    })
  }

  if (!isTokenValid) {
    return (
      <div className="map-error">
        <div className="error-content">
          <div className="error-icon">🗺️</div>
          <h3>Map Unavailable</h3>
          <p>Mapbox access token required</p>
          <div className="error-details">
            Add <code>VITE_MAPBOX_ACCESS_TOKEN</code> to your .env file
            <br />
            Get a free token at <a href="https://account.mapbox.com/" target="_blank" rel="noopener noreferrer">account.mapbox.com</a>
          </div>
        </div>
      </div>
    )
  }

  if (mapError) {
    return (
      <div className="map-error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h3>Map Error</h3>
          <p>{mapError}</p>
          <button
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="map-container">
      <div ref={mapContainer} className="mapbox-container" />

      {/* Map Loading Indicator */}
      {!isMapLoaded && (
        <div className="map-loading">
          <div className="loading-spinner"></div>
          <span>Loading map...</span>
        </div>
      )}

      {/* Map Status Overlay */}
      <div className="map-status">
        <div className="status-item">
          <span className="status-label">Map:</span>
          <span className={`status-value ${isMapLoaded ? 'ready' : 'loading'}`}>
            {isMapLoaded ? 'Ready' : 'Loading...'}
          </span>
        </div>
        {balloons && storms && (
          <div className="status-item">
            <span className="status-label">Data:</span>
            <span className="status-value ready">
              {Object.keys(balloons).length} balloons • {storms.length} alerts
            </span>
          </div>
        )}
        {selectedBalloon && (
          <div className="status-item selected">
            <span className="status-label">Selected:</span>
            <span className="status-value">Balloon {selectedBalloon}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default MapComponent