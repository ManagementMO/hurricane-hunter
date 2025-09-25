import { useState, useEffect } from 'react';
import './TimeSlider.css';

const TimeSlider = ({ onTimeChange }) => {
  const [currentTime, setCurrentTime] = useState(100); // Start at current time (100%)
  const [isPlaying, setIsPlaying] = useState(false);

  // Generate time labels for the last 24 hours
  const generateTimeLabels = () => {
    const labels = [];
    const now = new Date();
    for (let i = 24; i >= 0; i -= 6) {
      const time = new Date(now.getTime() - (i * 60 * 60 * 1000));
      labels.push(time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }));
    }
    return labels;
  };

  const timeLabels = generateTimeLabels();

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prevTime) => {
          if (prevTime >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prevTime + 1;
        });
      }, 200); // Update every 200ms for smooth animation
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    onTimeChange(currentTime);
  }, [currentTime, onTimeChange]);

  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value);
    setCurrentTime(value);
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (currentTime >= 100) {
      setCurrentTime(0);
    }
    setIsPlaying(!isPlaying);
  };

  const resetToNow = () => {
    setCurrentTime(100);
    setIsPlaying(false);
  };

  return (
    <div className="time-slider-container">
      <div className="time-slider-header">
        <h3>Temporal Analysis</h3>
        <div className="playback-controls">
          <button
            className={`play-button ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlayback}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <button className="reset-button" onClick={resetToNow}>
            🔄 Now
          </button>
        </div>
      </div>

      <div className="slider-wrapper">
        <input
          type="range"
          min="0"
          max="100"
          value={currentTime}
          onChange={handleSliderChange}
          className="time-slider"
        />
        <div className="time-labels">
          {timeLabels.map((label, index) => (
            <span
              key={index}
              className="time-label"
              style={{ left: `${(index / (timeLabels.length - 1)) * 100}%` }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="current-time-display">
        {currentTime === 100 ? 'Current Time' : `${Math.round((100 - currentTime) / 100 * 24)}h ago`}
      </div>
    </div>
  );
};

export default TimeSlider;