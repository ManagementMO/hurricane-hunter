import { useState } from 'react';
import './CoverageToggle.css';

const CoverageToggle = ({ isActive, onToggle, stationCount }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`coverage-toggle ${isActive ? 'active' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="toggle-header">
        <h3>Data Coverage</h3>
        <div className="toggle-switch" onClick={onToggle}>
          <div className={`toggle-slider ${isActive ? 'active' : ''}`}>
            <div className="toggle-handle"></div>
          </div>
        </div>
      </div>

      <div className="toggle-content">
        <div className="coverage-description">
          {isActive ? (
            <div className="active-description">
              <div className="station-count">
                {stationCount > 0 ? `${stationCount.toLocaleString()}` : '...'} Traditional Stations
              </div>
              <div className="coverage-note">
                Reveals gaps in traditional weather monitoring
              </div>
            </div>
          ) : (
            <div className="inactive-description">
              <div className="toggle-prompt">Show Traditional Weather Stations</div>
              <div className="coverage-hint">
                Compare coverage: land vs. ocean monitoring
              </div>
            </div>
          )}
        </div>
      </div>

      {isHovered && (
        <div className="coverage-tooltip">
          <div className="tooltip-content">
            {isActive
              ? "Click to hide traditional weather station coverage"
              : "Click to reveal the stark reality of weather monitoring gaps"
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverageToggle;