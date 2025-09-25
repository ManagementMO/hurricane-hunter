import { useState } from 'react';
import './TelemetryInstructions.css';

const TelemetryInstructions = ({ totalBalloons }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || totalBalloons === 0) return null;

  return (
    <div className="telemetry-instructions">
      <button
        className="close-instructions"
        onClick={() => setIsVisible(false)}
        aria-label="Close instructions"
      >
        ✕
      </button>
      <div className="instructions-content">
        <div className="instructions-icon">📊</div>
        <div className="instructions-text">
          <div className="instructions-title">Balloon Telemetry</div>
          <div className="instructions-subtitle">Click any balloon for detailed analytics</div>
        </div>
      </div>
    </div>
  );
};

export default TelemetryInstructions;