import './InsightPanel.css';

const InsightPanel = ({ balloons, storms, monitoringBalloons }) => {
  const totalBalloons = balloons ? Object.keys(balloons).length : 0;
  const totalStorms = storms ? storms.length : 0;
  const monitoringCount = monitoringBalloons ? monitoringBalloons.length : 0;

  return (
    <div className="insight-panel">
      <div className="panel-header">
        <h2>Mission Control</h2>
        <div className="status-indicator"></div>
      </div>

      <div className="metrics">
        <div className="metric">
          <div className="metric-value">{totalBalloons}</div>
          <div className="metric-label">Active Balloons</div>
        </div>

        <div className="metric">
          <div className="metric-value">{totalStorms}</div>
          <div className="metric-label">Tracked Storms</div>
        </div>

        <div className="metric critical">
          <div className="metric-value">{monitoringCount}</div>
          <div className="metric-label">Balloons Monitoring</div>
        </div>
      </div>

      {monitoringCount > 0 && (
        <div className="alert-section">
          <div className="alert-header">🎯 Active Monitoring</div>
          <div className="alert-text">
            {monitoringCount} balloon{monitoringCount > 1 ? 's' : ''} currently positioned to monitor storm systems
          </div>
        </div>
      )}

    </div>
  );
};

export default InsightPanel;