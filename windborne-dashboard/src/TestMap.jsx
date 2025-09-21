import { useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Set your Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

const TestMap = () => {
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (map.current) return // initialize map only once

    console.log('Creating test map...')
    console.log('Token:', mapboxgl.accessToken)

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12', // basic style
      center: [-74.5, 40], // starting position [lng, lat]
      zoom: 9 // starting zoom
    })

    map.current.on('load', () => {
      console.log('Test map loaded successfully!')
    })

    map.current.on('error', (e) => {
      console.error('Test map error:', e)
    })
  })

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: '400px',
        border: '2px solid red' // Make it visible
      }}
    />
  )
}

export default TestMap