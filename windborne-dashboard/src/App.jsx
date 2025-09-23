import { useState, useEffect } from 'react'
import './App.css'
import MapComponent from './MapComponent'
import StatisticsPanel from './StatisticsPanel'
import WeatherPanel from './WeatherPanel'
import AlertsPanel from './AlertsPanel'
import ControlPanel from './ControlPanel'

function App() {
  const [balloons, setBalloons] = useState(null)
  const [storms, setStorms] = useState(null)
  const [weatherData, setWeatherData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [selectedBalloon, setSelectedBalloon] = useState(null)
  const [mapCenter, setMapCenter] = useState([-95, 35])
  const [isLive, setIsLive] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState('connecting')

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      setConnectionStatus('connecting')

      try {
        // Fetch data from balloon and storm endpoints concurrently
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
        setConnectionStatus('connected')

        // Fetch weather data for the current map center
        await fetchWeatherData(mapCenter[1], mapCenter[0])

        console.log('Data fetched successfully:', {
          balloons: Object.keys(balloonsData).length,
          storms: stormsData.length
        })

      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err.message)
        setConnectionStatus('error')
      } finally {
        setIsLoading(false)
      }
    }

    const fetchWeatherData = async (lat, lon) => {
      try {
        // Using OpenWeatherMap API for current weather conditions
        // Note: Users will need to get their own API key and add to .env
        const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY
        if (!apiKey) {
          console.warn('OpenWeatherMap API key not found. Weather data disabled.')
          return
        }

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
        )

        if (response.ok) {
          const data = await response.json()
          setWeatherData(data)
        }
      } catch (err) {
        console.warn('Failed to fetch weather data:', err)
      }
    }

    fetchData()

    // Set up live data refresh if enabled
    let interval
    if (isLive) {
      interval = setInterval(fetchData, 5 * 60 * 1000) // 5 minutes
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isLive, mapCenter])

  const handleBalloonSelect = (balloonId) => {
    setSelectedBalloon(balloonId)
    if (balloons && balloons[balloonId]) {
      const latestPoint = balloons[balloonId].trajectory[balloons[balloonId].trajectory.length - 1]
      setMapCenter([latestPoint.lon, latestPoint.lat])
    }
  }

  const handleMapCenterChange = (center) => {
    setMapCenter(center)
  }

  const getSystemStatus = () => {
    if (isLoading) return { status: 'loading', message: 'Initializing systems...' }
    if (error) return { status: 'error', message: 'Connection lost' }
    if (!balloons || !storms) return { status: 'warning', message: 'Partial data' }
    return { status: 'operational', message: 'All systems operational' }
  }

  const systemStatus = getSystemStatus()

  if (error && !balloons && !storms) {
    return (
      <div className="error-screen">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>System Offline</h2>
          <p>{error}</p>
          <p className="error-detail">Make sure the backend server is running on http://localhost:8000</p>
          <button className="retry-button" onClick={() => window.location.reload()}>
            Reconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">🌀</span>
            <h1>Hurricane Hunter Control</h1>
          </div>
          <div className="mission-badge">
            <span>LIVE MISSION</span>
          </div>
        </div>
        <div className="header-right">
          <div className={`status-indicator ${systemStatus.status}`}>
            <div className="status-dot"></div>
            <span>{systemStatus.message}</span>
          </div>
          {lastUpdated && (
            <div className="last-update">
              Last update: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Left Sidebar */}
        <div className="sidebar-left">
          <ControlPanel
            isLive={isLive}
            onToggleLive={() => setIsLive(!isLive)}
            balloons={balloons}
            selectedBalloon={selectedBalloon}
            onBalloonSelect={handleBalloonSelect}
            connectionStatus={connectionStatus}
          />
          <StatisticsPanel
            balloons={balloons}
            storms={storms}
            weatherData={weatherData}
          />
        </div>

        {/* Main Map */}
        <div className="main-map">
          <MapComponent
            balloons={balloons}
            storms={storms}
            selectedBalloon={selectedBalloon}
            onBalloonSelect={handleBalloonSelect}
            onCenterChange={handleMapCenterChange}
            isLoading={isLoading}
          />
        </div>

        {/* Right Sidebar */}
        <div className="sidebar-right">
          <WeatherPanel
            weatherData={weatherData}
            mapCenter={mapCenter}
          />
          <AlertsPanel
            storms={storms}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-container">
            <div className="loading-animation">
              <div className="radar-sweep"></div>
              <div className="radar-dots">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>
            <h3>Initializing Mission Control</h3>
            <p>Connecting to balloon constellation...</p>
            <div className="loading-progress"></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App