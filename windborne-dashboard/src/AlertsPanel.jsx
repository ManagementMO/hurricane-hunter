import { useState, useEffect } from 'react'

const AlertsPanel = ({ storms, isLoading }) => {
  const [filteredStorms, setFilteredStorms] = useState([])
  const [filterSeverity, setFilterSeverity] = useState('all')

  useEffect(() => {
    if (!storms) return

    let filtered = [...storms]

    if (filterSeverity !== 'all') {
      filtered = filtered.filter(storm => {
        const severity = storm.properties.severity?.toLowerCase()
        const event = storm.properties.event.toLowerCase()

        switch (filterSeverity) {
          case 'critical':
            return severity === 'extreme' ||
                   event.includes('hurricane') ||
                   event.includes('tornado')
          case 'high':
            return severity === 'severe' ||
                   event.includes('storm surge') ||
                   event.includes('flash flood')
          case 'medium':
            return severity === 'moderate' ||
                   event.includes('thunderstorm') ||
                   event.includes('flood')
          default:
            return true
        }
      })
    }

    // Sort by urgency and severity
    filtered.sort((a, b) => {
      const urgencyOrder = { 'Immediate': 3, 'Expected': 2, 'Future': 1, 'Past': 0 }
      const aUrgency = urgencyOrder[a.properties.urgency] || 0
      const bUrgency = urgencyOrder[b.properties.urgency] || 0
      return bUrgency - aUrgency
    })

    setFilteredStorms(filtered)
  }, [storms, filterSeverity])

  const getSeverityColor = (storm) => {
    const severity = storm.properties.severity?.toLowerCase()
    const event = storm.properties.event.toLowerCase()

    if (severity === 'extreme' || event.includes('hurricane') || event.includes('tornado')) {
      return 'critical'
    } else if (severity === 'severe' || event.includes('storm surge')) {
      return 'high'
    } else if (severity === 'moderate' || event.includes('thunderstorm')) {
      return 'medium'
    }
    return 'low'
  }

  const getSeverityIcon = (storm) => {
    const event = storm.properties.event.toLowerCase()

    if (event.includes('hurricane') || event.includes('typhoon')) return '🌀'
    if (event.includes('tornado')) return '🌪️'
    if (event.includes('thunderstorm')) return '⛈️'
    if (event.includes('flood')) return '🌊'
    if (event.includes('fire')) return '🔥'
    if (event.includes('snow') || event.includes('blizzard')) return '🌨️'
    if (event.includes('wind')) return '💨'
    return '⚠️'
  }

  const getUrgencyBadge = (urgency) => {
    const badges = {
      'Immediate': { text: 'NOW', class: 'immediate' },
      'Expected': { text: 'SOON', class: 'expected' },
      'Future': { text: 'LATER', class: 'future' },
      'Past': { text: 'PAST', class: 'past' }
    }
    return badges[urgency] || { text: 'UNKNOWN', class: 'unknown' }
  }

  const truncateDescription = (description, maxLength = 100) => {
    if (!description) return 'No description available'
    return description.length > maxLength
      ? description.substring(0, maxLength) + '...'
      : description
  }

  const AlertCard = ({ storm }) => {
    const severityColor = getSeverityColor(storm)
    const severityIcon = getSeverityIcon(storm)
    const urgencyBadge = getUrgencyBadge(storm.properties.urgency)

    return (
      <div className={`alert-card ${severityColor}`}>
        <div className="alert-header">
          <div className="alert-icon">{severityIcon}</div>
          <div className="alert-title">
            <h4>{storm.properties.event}</h4>
            <div className={`urgency-badge ${urgencyBadge.class}`}>
              {urgencyBadge.text}
            </div>
          </div>
        </div>

        <div className="alert-content">
          <div className="alert-headline">
            {storm.properties.headline || 'No headline available'}
          </div>
          <div className="alert-description">
            {truncateDescription(storm.properties.description)}
          </div>
          {storm.properties.area_desc && (
            <div className="alert-area">
              <span className="area-label">Area:</span>
              <span className="area-value">{storm.properties.area_desc}</span>
            </div>
          )}
        </div>

        <div className="alert-meta">
          {storm.properties.severity && (
            <div className="meta-item">
              <span className="meta-label">Severity:</span>
              <span className={`meta-value severity-${severityColor}`}>
                {storm.properties.severity}
              </span>
            </div>
          )}
          {storm.properties.certainty && (
            <div className="meta-item">
              <span className="meta-label">Certainty:</span>
              <span className="meta-value">{storm.properties.certainty}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="alerts-panel">
      <div className="panel-header">
        <h3>Active Alerts</h3>
        <div className="alert-count">
          {isLoading ? '...' : filteredStorms.length}
        </div>
      </div>

      <div className="filter-controls">
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="severity-filter"
        >
          <option value="all">All Alerts</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
        </select>
      </div>

      <div className="alerts-list">
        {isLoading ? (
          <div className="loading-alerts">
            <div className="loading-spinner-small"></div>
            <span>Loading alerts...</span>
          </div>
        ) : filteredStorms.length === 0 ? (
          <div className="no-alerts">
            <div className="no-alerts-icon">✅</div>
            <div className="no-alerts-text">
              {storms?.length === 0 ? 'No active weather alerts' : 'No alerts match current filter'}
            </div>
          </div>
        ) : (
          filteredStorms.map((storm, index) => (
            <AlertCard key={storm.id || index} storm={storm} />
          ))
        )}
      </div>

      <div className="alerts-summary">
        <div className="summary-stats">
          <div className="summary-stat critical">
            <span className="stat-count">
              {storms?.filter(s => getSeverityColor(s) === 'critical').length || 0}
            </span>
            <span className="stat-label">Critical</span>
          </div>
          <div className="summary-stat high">
            <span className="stat-count">
              {storms?.filter(s => getSeverityColor(s) === 'high').length || 0}
            </span>
            <span className="stat-label">High</span>
          </div>
          <div className="summary-stat medium">
            <span className="stat-count">
              {storms?.filter(s => getSeverityColor(s) === 'medium').length || 0}
            </span>
            <span className="stat-label">Medium</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlertsPanel