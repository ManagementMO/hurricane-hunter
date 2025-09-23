import { useState, useEffect } from 'react'

const StatisticsPanel = ({ balloons, storms, weatherData }) => {
  const [stats, setStats] = useState({
    totalBalloons: 0,
    activeBalloons: 0,
    avgAltitude: 0,
    maxAltitude: 0,
    totalDistance: 0,
    activeStorms: 0,
    highSeverityStorms: 0
  })

  useEffect(() => {
    if (!balloons || !storms) return

    const balloonStats = calculateBalloonStats()
    const stormStats = calculateStormStats()

    setStats({
      ...balloonStats,
      ...stormStats
    })
  }, [balloons, storms])

  const calculateBalloonStats = () => {
    if (!balloons) return {}

    const balloonArray = Object.values(balloons)
    const totalBalloons = balloonArray.length
    const activeBalloons = balloonArray.filter(balloon => {
      const lastPoint = balloon.trajectory[balloon.trajectory.length - 1]
      const lastUpdate = new Date(lastPoint.timestamp)
      const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60)
      return hoursSinceUpdate < 2 // Consider active if updated within 2 hours
    }).length

    const altitudes = balloonArray.map(balloon => {
      const lastPoint = balloon.trajectory[balloon.trajectory.length - 1]
      return lastPoint.alt
    })

    const avgAltitude = altitudes.reduce((a, b) => a + b, 0) / altitudes.length
    const maxAltitude = Math.max(...altitudes)

    // Calculate total distance traveled by all balloons
    const totalDistance = balloonArray.reduce((total, balloon) => {
      return total + calculateTrajectoryDistance(balloon.trajectory)
    }, 0)

    return {
      totalBalloons,
      activeBalloons,
      avgAltitude: Math.round(avgAltitude),
      maxAltitude: Math.round(maxAltitude),
      totalDistance: Math.round(totalDistance / 1000) // Convert to km
    }
  }

  const calculateStormStats = () => {
    if (!storms) return {}

    const activeStorms = storms.length
    const highSeverityStorms = storms.filter(storm =>
      storm.properties.severity === 'Severe' ||
      storm.properties.severity === 'Extreme' ||
      storm.properties.event.toLowerCase().includes('hurricane') ||
      storm.properties.event.toLowerCase().includes('tornado')
    ).length

    return {
      activeStorms,
      highSeverityStorms
    }
  }

  const calculateTrajectoryDistance = (trajectory) => {
    if (trajectory.length < 2) return 0

    let totalDistance = 0
    for (let i = 1; i < trajectory.length; i++) {
      const prev = trajectory[i - 1]
      const curr = trajectory[i]
      totalDistance += haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon)
    }
    return totalDistance
  }

  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000 // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const StatCard = ({ title, value, unit, icon, trend, color = 'primary' }) => (
    <div className={`stat-card ${color}`}>
      <div className="stat-header">
        <span className="stat-icon">{icon}</span>
        <span className="stat-title">{title}</span>
      </div>
      <div className="stat-value">
        <span className="stat-number">{typeof value === 'number' ? value.toLocaleString() : value}</span>
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
      {trend && <div className={`stat-trend ${trend.direction}`}>{trend.text}</div>}
    </div>
  )

  return (
    <div className="statistics-panel">
      <div className="panel-header">
        <h3>Mission Statistics</h3>
        <div className="header-badge">Live</div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Balloons"
          value={stats.totalBalloons}
          icon="🎈"
          color="primary"
        />

        <StatCard
          title="Active Balloons"
          value={stats.activeBalloons}
          icon="📡"
          color="success"
        />

        <StatCard
          title="Avg Altitude"
          value={stats.avgAltitude}
          unit="m"
          icon="⬆️"
          color="info"
        />

        <StatCard
          title="Max Altitude"
          value={stats.maxAltitude}
          unit="m"
          icon="🚀"
          color="warning"
        />

        <StatCard
          title="Total Distance"
          value={stats.totalDistance}
          unit="km"
          icon="🛣️"
          color="primary"
        />

        <StatCard
          title="Active Storms"
          value={stats.activeStorms}
          icon="🌪️"
          color="danger"
        />

        <StatCard
          title="High Severity"
          value={stats.highSeverityStorms}
          icon="⚠️"
          color="critical"
        />

        {weatherData && (
          <StatCard
            title="Local Temp"
            value={Math.round(weatherData.main.temp)}
            unit="°C"
            icon="🌡️"
            color="info"
          />
        )}
      </div>

      <div className="quick-stats">
        <div className="quick-stat">
          <div className="quick-stat-label">Mission Uptime</div>
          <div className="quick-stat-value">24h 17m</div>
        </div>
        <div className="quick-stat">
          <div className="quick-stat-label">Data Quality</div>
          <div className="quick-stat-value">98.7%</div>
        </div>
        <div className="quick-stat">
          <div className="quick-stat-label">Coverage</div>
          <div className="quick-stat-value">Global</div>
        </div>
      </div>
    </div>
  )
}

export default StatisticsPanel