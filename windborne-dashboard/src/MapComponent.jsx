import { useRef, useEffect, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Set your Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

const MapComponent = ({ balloons, storms }) => {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const balloonMarkers = useRef([])
  const [mapError, setMapError] = useState(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  // Check if Mapbox token is provided and valid
  const isTokenValid = mapboxgl.accessToken &&
    !mapboxgl.accessToken.includes('example') &&
    mapboxgl.accessToken !== 'undefined' &&
    mapboxgl.accessToken.length >= 50

  // Initialize map - following 2025 best practices
  useEffect(() => {
    // Don't initialize if token is invalid or map already exists
    if (!isTokenValid || map.current) return

    // Ensure container is ready
    if (!mapContainer.current) {
      console.log('Container not ready, retrying...')
      return
    }

    console.log('Initializing Mapbox map...')

    try {
      // Initialize map instance
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-95, 35],
        zoom: 3,
        attributionControl: false,
        logoPosition: 'bottom-right',
        preserveDrawingBuffer: true // Helps with rendering issues
      })

      console.log('Map instance created')

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

      // Handle map load event
      map.current.on('load', () => {
        console.log('Map loaded successfully!')
        setIsMapLoaded(true)
        initializeMapLayers()
      })

      // Handle style load (important for React)
      map.current.on('style.load', () => {
        console.log('Map style loaded')
      })

      // Handle errors
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e)
        setMapError(e.error?.message || 'Map failed to load')
      })

      // Force a resize after a short delay to ensure proper rendering
      setTimeout(() => {
        if (map.current) {
          map.current.resize()
          console.log('Map resized')
        }
      }, 100)

    } catch (error) {
      console.error('Error creating map:', error)
      setMapError(error.message)
    }

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
        setIsMapLoaded(false)
      }
    }
  }, [isTokenValid, initializeMapLayers])

  const initializeMapLayers = useCallback(() => {
    if (!map.current) return

    try {
      // Load hurricane icon
      map.current.loadImage(
        'data:image/svg+xml;base64,' + btoa(`
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#e74c3c" stroke="#fff" stroke-width="2"/>
            <path d="M12 2 L12 22 M2 12 L22 12" stroke="#fff" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="#fff"/>
          </svg>
        `),
        'hurricane-icon'
      )

      // Add balloon trajectories source
      map.current.addSource('balloon-trajectories', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      // Add storm centers source
      map.current.addSource('storm-centers', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      // Add storm cones source
      map.current.addSource('storm-cones', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      // Add layers in order (bottom to top)

      // Storm cones layer
      map.current.addLayer({
        id: 'storm-cones',
        type: 'fill',
        source: 'storm-cones',
        paint: {
          'fill-color': '#e74c3c',
          'fill-opacity': 0.2,
          'fill-outline-color': '#e74c3c'
        }
      })

      // Balloon trajectories layer
      map.current.addLayer({
        id: 'balloon-trajectories',
        type: 'line',
        source: 'balloon-trajectories',
        paint: {
          'line-color': '#00cffc',
          'line-width': 2,
          'line-opacity': 0.8
        }
      })

      // Storm centers layer
      map.current.addLayer({
        id: 'storm-centers',
        type: 'symbol',
        source: 'storm-centers',
        layout: {
          'icon-image': 'hurricane-icon',
          'icon-allow-overlap': true,
          'icon-size': 0.8
        }
      })

      // Add interactivity
      addInteractivity()

      console.log('Map layers initialized successfully')
    } catch (error) {
      console.error('Error initializing map layers:', error)
      setMapError('Failed to initialize map layers')
    }
  }, [])

  const updateMapData = useCallback(() => {
    if (!isMapLoaded || !map.current) {
      return
    }

    // Clear existing balloon markers
    balloonMarkers.current.forEach(marker => marker.remove())
    balloonMarkers.current = []

    // Transform balloons to GeoJSON trajectories
    const balloonFeatures = Object.values(balloons).map(balloon => {
      const coordinates = balloon.trajectory.map(point => [point.lon, point.lat])
      const latestPoint = balloon.trajectory[balloon.trajectory.length - 1]

      return {
        type: 'Feature',
        properties: {
          balloonId: balloon.id,
          latestAlt: latestPoint.alt,
          trajectoryLength: balloon.trajectory.length
        },
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      }
    })

    // Update balloon trajectories
    map.current.getSource('balloon-trajectories').setData({
      type: 'FeatureCollection',
      features: balloonFeatures
    })

    // Add pulsating markers for latest balloon positions
    Object.values(balloons).forEach(balloon => {
      const latestPoint = balloon.trajectory[balloon.trajectory.length - 1]

      // Create custom marker element
      const markerElement = document.createElement('div')
      markerElement.className = 'pulsating-dot'

      // Add tooltip on hover
      markerElement.title = `Balloon ${balloon.id}\nAltitude: ${latestPoint.alt.toFixed(1)}m\nLast update: ${new Date(latestPoint.timestamp).toLocaleTimeString()}`

      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([latestPoint.lon, latestPoint.lat])
        .addTo(map.current)

      balloonMarkers.current.push(marker)
    })

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

    const stormConeFeatures = storms
      .filter(storm => storm.geometry && storm.geometry.coordinates.length > 0)
      .map(storm => ({
        type: 'Feature',
        properties: {
          id: storm.id,
          event: storm.properties.event
        },
        geometry: storm.geometry
      }))

    // Update storm sources
    map.current.getSource('storm-centers').setData({
      type: 'FeatureCollection',
      features: stormCenterFeatures
    })

    map.current.getSource('storm-cones').setData({
      type: 'FeatureCollection',
      features: stormConeFeatures
    })

    console.log('Map data updated:', {
      balloons: balloonFeatures.length,
      stormCenters: stormCenterFeatures.length,
      stormCones: stormConeFeatures.length
    })
  }, [balloons, storms, isMapLoaded])

  // Update data when props change
  useEffect(() => {
    if (!map.current || !balloons || !storms || !isMapLoaded) return

    updateMapData()
  }, [balloons, storms, isMapLoaded, updateMapData])

  const getStormCenter = (storm) => {
    if (!storm.geometry || !storm.geometry.coordinates || storm.geometry.coordinates.length === 0) {
      // Default to center of US if no geometry
      return [-95, 35]
    }

    const coords = storm.geometry.coordinates[0]
    if (Array.isArray(coords) && coords.length > 0) {
      // Calculate centroid of polygon
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

      const popup = new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div class="balloon-popup">
            <h4>Balloon ${feature.properties.balloonId}</h4>
            <p>Current Altitude: ${feature.properties.latestAlt.toFixed(1)}m</p>
            <p>Trajectory Points: ${feature.properties.trajectoryLength}</p>
          </div>
        `)
        .addTo(map.current)

      // Store popup to remove on mouseleave
      map.current._balloonPopup = popup
    })

    map.current.on('mouseleave', 'balloon-trajectories', () => {
      map.current.getCanvas().style.cursor = ''
      if (map.current._balloonPopup) {
        map.current._balloonPopup.remove()
        map.current._balloonPopup = null
      }
    })

    // Storm center click
    map.current.on('click', 'storm-centers', (e) => {
      const feature = e.features[0]
      const coordinates = e.lngLat

      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div class="storm-popup">
            <h3>${feature.properties.event}</h3>
            <p><strong>Headline:</strong> ${feature.properties.headline || 'N/A'}</p>
            <p class="storm-severity"><strong>Severity:</strong> ${feature.properties.severity || 'N/A'}</p>
            <p><strong>Urgency:</strong> ${feature.properties.urgency || 'N/A'}</p>
            <p><strong>Area:</strong> ${feature.properties.areaDesc || 'N/A'}</p>
            ${feature.properties.description ? `<p><strong>Details:</strong> ${feature.properties.description.substring(0, 200)}...</p>` : ''}
          </div>
        `)
        .addTo(map.current)
    })

    // Change cursor on hover
    map.current.on('mouseenter', 'storm-centers', () => {
      map.current.getCanvas().style.cursor = 'pointer'
    })

    map.current.on('mouseleave', 'storm-centers', () => {
      map.current.getCanvas().style.cursor = ''
    })
  }

  // Show token error if invalid
  if (!isTokenValid) {
    return (
      <div className="map-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ color: '#e74c3c', fontSize: '18px' }}>
          ⚠️ Mapbox Access Token Issue
        </div>
        <div style={{ color: '#bdc3c7', textAlign: 'center' }}>
          Token status: {mapboxgl.accessToken ? `Present (${mapboxgl.accessToken.length} chars)` : 'Missing'}
          <br />
          Please add a valid Mapbox access token to the .env file:
          <br />
          <code>VITE_MAPBOX_ACCESS_TOKEN=your_token_here</code>
          <br />
          Get one from <a href="https://account.mapbox.com/" target="_blank" rel="noopener noreferrer">account.mapbox.com</a>
        </div>
      </div>
    )
  }

  // Show map error if any
  if (mapError) {
    return (
      <div className="map-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ color: '#e74c3c', fontSize: '18px' }}>
          ⚠️ Map Error
        </div>
        <div style={{ color: '#bdc3c7', textAlign: 'center' }}>
          {mapError}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div
      ref={mapContainer}
      className="map-container"
      style={{
        width: '100vw',
        height: '100vh',
        background: '#111',
        position: 'relative'
      }}
    >
      {/* Status indicator */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        color: '#00cffc',
        fontSize: '12px',
        zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        padding: '10px',
        borderRadius: '4px'
      }}>
        <div>Map: {isMapLoaded ? 'Loaded' : 'Loading...'}</div>
        {balloons && storms && (
          <div>Data: {Object.keys(balloons).length} balloons • {storms.length} storms</div>
        )}
      </div>

      {/* Loading indicator */}
      {!isMapLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#00cffc',
          fontSize: '18px',
          zIndex: 1000,
          textAlign: 'center'
        }}>
          Loading Mapbox...
        </div>
      )}
    </div>
  )
}

export default MapComponent