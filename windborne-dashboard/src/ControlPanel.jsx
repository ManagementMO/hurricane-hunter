import { useState, useEffect } from 'react'

const ControlPanel = ({
  isLive,
  onToggleLive,
  balloons,
  selectedBalloon,
  onBalloonSelect,
  connectionStatus
}) => {
  const [expandedSections, setExpandedSections] = useState({
    balloons: true,
    controls: true,
    filters: false
  })

  const [filters, setFilters] = useState({
    showTrajectories: true,
    showCurrentPositions: true,
    minAltitude: 0,
    maxAltitude: 50000,
    timeRange: '24h'
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const getBalloonStatus = (balloon) => {
    const lastPoint = balloon.trajectory[balloon.trajectory.length - 1]
    const lastUpdate = new Date(lastPoint.timestamp)
    const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60)

    if (hoursSinceUpdate < 1) return { status: 'active', text: 'Active' }
    if (hoursSinceUpdate < 2) return { status: 'recent', text: 'Recent' }
    if (hoursSinceUpdate < 6) return { status: 'delayed', text: 'Delayed' }
    return { status: 'offline', text: 'Offline' }
  }

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢'
      case 'connecting': return '🟡'
      case 'error': return '🔴'
      default: return '⚪'
    }
  }

  const BalloonListItem = ({ balloon }) => {
    const status = getBalloonStatus(balloon)
    const lastPoint = balloon.trajectory[balloon.trajectory.length - 1]
    const isSelected = selectedBalloon === balloon.id

    return (
      <div
        className={`balloon-item ${isSelected ? 'selected' : ''} ${status.status}`}
        onClick={() => onBalloonSelect(balloon.id)}
      >
        <div className="balloon-header">
          <div className="balloon-id">Balloon {balloon.id}</div>
          <div className={`balloon-status ${status.status}`}>
            {status.text}
          </div>
        </div>
        <div className="balloon-details">
          <div className="detail-row">
            <span className="detail-label">Alt:</span>
            <span className="detail-value">{Math.round(lastPoint.alt).toLocaleString()}m</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Pos:</span>
            <span className="detail-value">
              {lastPoint.lat.toFixed(2)}°, {lastPoint.lon.toFixed(2)}°
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Points:</span>
            <span className="detail-value">{balloon.trajectory.length}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="control-panel">
      {/* Connection Status */}
      <div className="connection-status">
        <div className="status-row">
          <span className="status-icon">{getConnectionIcon()}</span>
          <span className="status-text">
            {connectionStatus === 'connected' ? 'System Online' :
             connectionStatus === 'connecting' ? 'Connecting...' :
             'Connection Error'}
          </span>
        </div>
      </div>

      {/* Live Controls */}
      <div className="panel-section">
        <div
          className="section-header"
          onClick={() => toggleSection('controls')}
        >
          <h4>Mission Control</h4>
          <span className={`expand-icon ${expandedSections.controls ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
        {expandedSections.controls && (
          <div className="section-content">
            <div className="control-group">
              <div className="control-item">
                <button
                  className={`live-toggle ${isLive ? 'active' : ''}`}
                  onClick={onToggleLive}
                >
                  <span className="toggle-icon">{isLive ? '⏸️' : '▶️'}</span>
                  <span className="toggle-text">
                    {isLive ? 'Live Updates On' : 'Live Updates Off'}
                  </span>
                </button>
              </div>
              <div className="control-item">
                <button className="control-button secondary">
                  <span>📊</span>
                  Export Data
                </button>
              </div>
              <div className="control-item">
                <button className="control-button secondary">
                  <span>🎯</span>
                  Center Map
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Balloon List */}
      <div className="panel-section">
        <div
          className="section-header"
          onClick={() => toggleSection('balloons')}
        >
          <h4>Active Balloons</h4>
          <div className="section-badge">
            {balloons ? Object.keys(balloons).length : 0}
          </div>
          <span className={`expand-icon ${expandedSections.balloons ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
        {expandedSections.balloons && (
          <div className="section-content">
            <div className="balloons-list">
              {balloons ? (
                Object.values(balloons).map(balloon => (
                  <BalloonListItem
                    key={balloon.id}
                    balloon={balloon}
                  />
                ))
              ) : (
                <div className="loading-balloons">
                  <div className="loading-spinner-small"></div>
                  <span>Loading balloons...</span>
                </div>
              )}
            </div>
            {selectedBalloon && (
              <div className="selection-info">
                <div className="info-header">Selected: Balloon {selectedBalloon}</div>
                <button
                  className="clear-selection"
                  onClick={() => onBalloonSelect(null)}
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Display Filters */}
      <div className="panel-section">
        <div
          className="section-header"
          onClick={() => toggleSection('filters')}
        >
          <h4>Display Options</h4>
          <span className={`expand-icon ${expandedSections.filters ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
        {expandedSections.filters && (
          <div className="section-content">
            <div className="filter-group">
              <label className="filter-item">
                <input
                  type="checkbox"
                  checked={filters.showTrajectories}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    showTrajectories: e.target.checked
                  }))}
                />
                <span className="filter-label">Show Trajectories</span>
              </label>
              <label className="filter-item">
                <input
                  type="checkbox"
                  checked={filters.showCurrentPositions}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    showCurrentPositions: e.target.checked
                  }))}
                />
                <span className="filter-label">Current Positions</span>
              </label>
            </div>

            <div className="filter-group">
              <div className="range-filter">
                <label className="range-label">Min Altitude: {filters.minAltitude}m</label>
                <input
                  type="range"
                  min="0"
                  max="30000"
                  step="1000"
                  value={filters.minAltitude}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    minAltitude: parseInt(e.target.value)
                  }))}
                  className="range-slider"
                />
              </div>
              <div className="range-filter">
                <label className="range-label">Max Altitude: {filters.maxAltitude}m</label>
                <input
                  type="range"
                  min="10000"
                  max="50000"
                  step="1000"
                  value={filters.maxAltitude}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    maxAltitude: parseInt(e.target.value)
                  }))}
                  className="range-slider"
                />
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">Time Range:</label>
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  timeRange: e.target.value
                }))}
                className="time-select"
              >
                <option value="1h">Last Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="12h">Last 12 Hours</option>
                <option value="24h">Last 24 Hours</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ControlPanel