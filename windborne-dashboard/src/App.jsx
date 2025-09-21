import { useState, useEffect } from 'react'
import './App.css'
import MapComponent from './MapComponent'
import TestMap from './TestMap'

function App() {
  const [balloons, setBalloons] = useState(null)
  const [storms, setStorms] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch data from both endpoints concurrently
        const [balloonsResponse, stormsResponse] = await Promise.all([
          fetch('http://localhost:8000/api/balloons/history'),
          fetch('http://localhost:8000/api/storms')
        ])

        if (!balloonsResponse.ok) {
          throw new Error(`Balloons API error: ${balloonsResponse.status}`)
        }

        if (!stormsResponse.ok) {
          throw new Error(`Storms API error: ${stormsResponse.status}`)
        }

        const balloonsData = await balloonsResponse.json()
        const stormsData = await stormsResponse.json()

        setBalloons(balloonsData)
        setStorms(stormsData)
        setLastUpdated(new Date())

        console.log('Data fetched successfully:', {
          balloons: Object.keys(balloonsData).length,
          storms: stormsData.length
        })

      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    // Refresh data every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  if (error) {
    return (
      <div className="error-message">
        <h3>Connection Error</h3>
        <p>{error}</p>
        <p>Make sure the backend server is running on http://localhost:8000</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="App">
      {/* Mission Control Header */}
      <div className="mission-control-header">
        <h1>🌀 Hurricane Hunter Mission Control</h1>
      </div>

      {/* Status Indicator */}
      <div className={`status-indicator ${isLoading ? 'loading' : 'online'}`}>
        <div>
          {isLoading ? 'Loading data...' : '● System Online'}
        </div>
        {lastUpdated && !isLoading && (
          <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
        {balloons && storms && !isLoading && (
          <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
            {Object.keys(balloons).length} balloons • {storms.length} alerts
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div>Loading mission data...</div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>
            Fetching balloon trajectories and storm alerts
          </div>
        </div>
      )}

      {/* Debug info for data state */}
      <div style={{
        position: 'absolute',
        top: '100px',
        right: '20px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 2000
      }}>
        <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
        <div>Balloons: {balloons ? Object.keys(balloons).length : 'null'}</div>
        <div>Storms: {storms ? storms.length : 'null'}</div>
        <div>Should show map: {(!isLoading && balloons && storms) ? 'Yes' : 'No'}</div>
      </div>

      {/* Map Component */}
      {!isLoading && balloons && storms && (
        <MapComponent
          balloons={balloons}
          storms={storms}
        />
      )}

      {/* Always show map for debugging */}
      {!(!isLoading && balloons && storms) && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'rgba(255,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '4px'
        }}>
          Map not showing because: Loading={isLoading.toString()}, Balloons={!!balloons}, Storms={!!storms}
        </div>
      )}
    </div>
  )
}

export default App