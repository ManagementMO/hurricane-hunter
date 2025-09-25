import { useState, useEffect } from 'react';
import './StormFilter.css';

const StormFilter = ({ storms, onFilterChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    severity: {
      'Extreme': true,
      'Severe': true,
      'Moderate': true,
      'Minor': true,
      'Unknown': true
    },
    eventType: {},
    showAll: true
  });

  // Extract unique event types and severities from storms
  useEffect(() => {
    if (!storms) return;

    const eventTypes = {};
    storms.forEach(storm => {
      if (storm.properties?.event) {
        eventTypes[storm.properties.event] = true;
      }
    });

    setFilters(prev => ({
      ...prev,
      eventType: eventTypes
    }));
  }, [storms]);

  const handleSeverityChange = (severity, checked) => {
    const newFilters = {
      ...filters,
      severity: {
        ...filters.severity,
        [severity]: checked
      }
    };

    // Check if all severity filters are enabled
    const allSeverityEnabled = Object.values(newFilters.severity).every(v => v);
    const allEventEnabled = Object.values(newFilters.eventType).every(v => v);
    newFilters.showAll = allSeverityEnabled && allEventEnabled;

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleEventTypeChange = (eventType, checked) => {
    const newFilters = {
      ...filters,
      eventType: {
        ...filters.eventType,
        [eventType]: checked
      }
    };

    // Check if all filters are enabled
    const allSeverityEnabled = Object.values(newFilters.severity).every(v => v);
    const allEventEnabled = Object.values(newFilters.eventType).every(v => v);
    newFilters.showAll = allSeverityEnabled && allEventEnabled;

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleShowAllToggle = () => {
    const showAll = !filters.showAll;
    const newFilters = {
      severity: Object.keys(filters.severity).reduce((acc, key) => {
        acc[key] = showAll;
        return acc;
      }, {}),
      eventType: Object.keys(filters.eventType).reduce((acc, key) => {
        acc[key] = showAll;
        return acc;
      }, {}),
      showAll
    };

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'extreme': return '#ff4444';
      case 'severe': return '#ff8800';
      case 'moderate': return '#ffcc00';
      case 'minor': return '#88cc00';
      default: return '#888888';
    }
  };

  const activeFiltersCount = Object.values(filters.severity).filter(v => v).length +
                           Object.values(filters.eventType).filter(v => v).length;
  const totalFiltersCount = Object.keys(filters.severity).length +
                          Object.keys(filters.eventType).length;

  return (
    <div className={`storm-filter ${isExpanded ? 'expanded' : ''}`}>
      <div
        className="filter-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="filter-icon">🌀</div>
        <div className="filter-title">Storm Filters</div>
        <div className="filter-count">
          {activeFiltersCount}/{totalFiltersCount}
        </div>
        <div className={`expand-arrow ${isExpanded ? 'expanded' : ''}`}>
          ›
        </div>
      </div>

      <div className="filter-content">
        <div className="filter-section">
          <div className="section-header">
            <h4>Show All</h4>
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={filters.showAll}
                onChange={handleShowAllToggle}
              />
              <span className="checkmark"></span>
            </label>
          </div>
        </div>

        <div className="filter-section">
          <h4>Severity Level</h4>
          {Object.entries(filters.severity).map(([severity, checked]) => (
            <label key={severity} className="filter-checkbox">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => handleSeverityChange(severity, e.target.checked)}
              />
              <span className="checkmark"></span>
              <span
                className="severity-indicator"
                style={{ backgroundColor: getSeverityColor(severity) }}
              ></span>
              <span className="filter-label">{severity}</span>
            </label>
          ))}
        </div>

        {Object.keys(filters.eventType).length > 0 && (
          <div className="filter-section">
            <h4>Event Type</h4>
            {Object.entries(filters.eventType).map(([eventType, checked]) => (
              <label key={eventType} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => handleEventTypeChange(eventType, e.target.checked)}
                />
                <span className="checkmark"></span>
                <span className="filter-label">{eventType}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StormFilter;