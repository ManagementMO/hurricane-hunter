import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as turf from '@turf/turf';
import './TelemetryPanel.css';

const TelemetryPanel = ({ balloon, isMonitoring, onClose }) => {
  // Calculate analytics from balloon trajectory
  const analytics = useMemo(() => {
    if (!balloon?.trajectory || balloon.trajectory.length < 2) {
      return {
        totalDistance: 0,
        averageSpeed: 0,
        maxAltitude: 0,
        minAltitude: 0,
        altitudeData: []
      };
    }

    const trajectory = balloon.trajectory;
    let totalDistance = 0;
    const altitudeData = [];

    // Process trajectory data for analytics and chart
    for (let i = 0; i < trajectory.length; i++) {
      const point = trajectory[i];
      const timestamp = new Date(point.timestamp);

      // Add to altitude chart data
      altitudeData.push({
        time: timestamp.getTime(),
        timeFormatted: timestamp.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
        altitude: point.alt / 1000, // Convert to kilometers
        altitudeMeters: point.alt
      });

      // Calculate distance between consecutive points
      if (i > 0) {
        const prevPoint = trajectory[i - 1];
        const from = turf.point([prevPoint.lon, prevPoint.lat]);
        const to = turf.point([point.lon, point.lat]);
        const distance = turf.distance(from, to, { units: 'kilometers' });
        totalDistance += distance;
      }
    }

    // Calculate average speed (km/h)
    const startTime = new Date(trajectory[0].timestamp);
    const endTime = new Date(trajectory[trajectory.length - 1].timestamp);
    const totalHours = (endTime - startTime) / (1000 * 60 * 60);
    const averageSpeed = totalHours > 0 ? totalDistance / totalHours : 0;

    // Get altitude extremes
    const altitudes = trajectory.map(p => p.alt);
    const maxAltitude = Math.max(...altitudes);
    const minAltitude = Math.min(...altitudes);

    return {
      totalDistance: totalDistance.toFixed(1),
      averageSpeed: averageSpeed.toFixed(1),
      maxAltitude: (maxAltitude / 1000).toFixed(2),
      minAltitude: (minAltitude / 1000).toFixed(2),
      altitudeData
    };
  }, [balloon]);

  // Get current position data
  const currentPosition = balloon?.trajectory?.[balloon.trajectory.length - 1];

  if (!balloon) return null;

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <p className="tooltip-time">{`Time: ${data.timeFormatted}`}</p>
          <p className="tooltip-altitude">{`Altitude: ${data.altitude.toFixed(2)} km`}</p>
          <p className="tooltip-altitude-meters">{`(${data.altitudeMeters.toFixed(0)} m)`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="telemetry-panel">
      <div className="telemetry-header">
        <h2>Balloon Telemetry: {balloon.id}</h2>
        {isMonitoring && (
          <div className="monitoring-badge">
            <span className="monitoring-icon">⚠️</span>
            <span>MONITORING STORM</span>
          </div>
        )}
        <button className="close-button" onClick={onClose} aria-label="Close telemetry panel">
          ✕
        </button>
      </div>

      <div className="telemetry-content">
        {/* Current Status */}
        <div className="current-status">
          <h3>Current Status</h3>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Latitude</span>
              <span className="status-value">{currentPosition?.lat.toFixed(6)}°</span>
            </div>
            <div className="status-item">
              <span className="status-label">Longitude</span>
              <span className="status-value">{currentPosition?.lon.toFixed(6)}°</span>
            </div>
            <div className="status-item">
              <span className="status-label">Current Altitude</span>
              <span className="status-value">{(currentPosition?.alt / 1000).toFixed(2)} km</span>
            </div>
            <div className="status-item">
              <span className="status-label">Last Update</span>
              <span className="status-value">
                {currentPosition ? new Date(currentPosition.timestamp).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Altitude History Chart */}
        <div className="chart-section">
          <h3>Altitude History (24 Hours)</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.altitudeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="time"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                  stroke="rgba(255,255,255,0.7)"
                />
                <YAxis
                  stroke="rgba(255,255,255,0.7)"
                  label={{ value: 'Altitude (km)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'rgba(255,255,255,0.7)' } }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="altitude"
                  stroke={isMonitoring ? "#ff6b00" : "#00ccff"}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: isMonitoring ? "#ff6b00" : "#00ccff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Analytics */}
        <div className="analytics-section">
          <h3>24-Hour Analytics</h3>
          <div className="analytics-grid">
            <div className="analytics-item">
              <span className="analytics-label">Total Distance Traveled</span>
              <span className="analytics-value">{analytics.totalDistance} km</span>
            </div>
            <div className="analytics-item">
              <span className="analytics-label">Average Speed</span>
              <span className="analytics-value">{analytics.averageSpeed} km/h</span>
            </div>
            <div className="analytics-item">
              <span className="analytics-label">Maximum Altitude</span>
              <span className="analytics-value">{analytics.maxAltitude} km</span>
            </div>
            <div className="analytics-item">
              <span className="analytics-label">Minimum Altitude</span>
              <span className="analytics-value">{analytics.minAltitude} km</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelemetryPanel;