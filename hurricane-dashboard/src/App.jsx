import { useState, useEffect, useCallback } from 'react';
import * as turf from '@turf/turf';
import LeafletMap from './components/LeafletMap';
import InsightPanel from './components/InsightPanel';
import TimeSlider from './components/TimeSlider';
import StormFilter from './components/StormFilter';
import TelemetryPanel from './components/TelemetryPanel';
import TelemetryInstructions from './components/TelemetryInstructions';
import CoverageToggle from './components/CoverageToggle';
import { API_ENDPOINTS, isDevelopment, API_BASE_URL } from './config';
import './App.css';

function App() {
  const [balloons, setBalloons] = useState(null);
  const [storms, setStorms] = useState(null);
  const [traditionalStations, setTraditionalStations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTime, setSelectedTime] = useState(100);
  const [monitoringBalloons, setMonitoringBalloons] = useState([]);
  const [selectedBalloonId, setSelectedBalloonId] = useState(null);
  const [showCoverage, setShowCoverage] = useState(false);
  const [stormFilters, setStormFilters] = useState({
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

  // Log environment info
  useEffect(() => {
    console.log(`🌪️ Hurricane Hunter Dashboard`);
    console.log(`Environment: ${isDevelopment ? 'Development' : 'Production'}`);
    console.log(`API Base URL: ${API_BASE_URL}`);
  }, []);

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [balloonsResponse, stormsResponse] = await Promise.all([
          fetch(API_ENDPOINTS.balloons),
          fetch(API_ENDPOINTS.storms)
        ]);

        if (!balloonsResponse.ok || !stormsResponse.ok) {
          throw new Error('Failed to fetch data from backend - using demo data');
        }

        const balloonsData = await balloonsResponse.json();
        const stormsData = await stormsResponse.json();

        setBalloons(balloonsData);
        setStorms(stormsData);
        setError(null);
      } catch (err) {
        console.error(`Error fetching data from ${isDevelopment ? 'local' : 'production'} backend, using demo data:`, err);

        // Use demo data when backend is not available
        const demoData = generateDemoData();
        setBalloons(demoData.balloons);
        setStorms(demoData.storms);
        setError(null); // Don't show error with demo data
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch traditional stations data when coverage is toggled on
  useEffect(() => {
    if (showCoverage && !traditionalStations) {
      const fetchTraditionalStations = async () => {
        try {
          console.log('Fetching traditional stations data...');
          const response = await fetch(API_ENDPOINTS.traditionalStations);

          if (response.ok) {
            const data = await response.json();
            console.log('Traditional stations raw data:', data);
            setTraditionalStations(data);
            console.log(`Loaded ${data.features?.length || 0} traditional weather stations`);
          } else {
            console.error('Failed to fetch traditional stations:', response.status);
          }
        } catch (error) {
          console.error('Error fetching traditional stations:', error);
        }
      };

      fetchTraditionalStations();
    }
  }, [showCoverage, traditionalStations]);

  // Generate demo data for testing
  const generateDemoData = () => {
    const balloons = {};
    const storms = [];

    // Generate 3 demo balloons spread across different regions
    const balloonRegions = [
      { lat: 29.0, lon: -90.0, name: 'Gulf of Mexico' },
      { lat: 27.5, lon: -82.5, name: 'Tampa Bay' },
      { lat: 31.0, lon: -81.0, name: 'Georgia Coast' }
    ];

    for (let i = 0; i < 3; i++) {
      const region = balloonRegions[i];
      const trajectory = [];

      // Create a more realistic 24-hour trajectory
      for (let j = 0; j < 24; j++) {
        const timeProgress = j / 24;
        // Balloons drift generally eastward with wind patterns
        const drift = timeProgress * 2.0; // Drift about 2 degrees over 24 hours

        trajectory.push({
          lat: region.lat + (Math.random() - 0.5) * 1.0, // More spread
          lon: region.lon + drift + (Math.random() - 0.5) * 0.8,
          alt: 15000 + Math.random() * 5000,
          timestamp: new Date(Date.now() - (24 - j) * 60 * 60 * 1000).toISOString()
        });
      }

      balloons[`balloon_${i}`] = {
        id: `balloon_${i}`,
        trajectory
      };
    }

    // Generate 2 demo storms in different locations
    storms.push({
      id: 'storm_1',
      type: 'Feature',
      properties: {
        headline: 'Hurricane Helena - Category 2',
        description: 'Hurricane Helena is moving northwest at 12 mph with maximum sustained winds of 105 mph.',
        severity: 'Extreme',
        event: 'Hurricane Warning',
        area_desc: 'Gulf of Mexico'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-92.0, 27.0], [-92.0, 30.0], [-89.0, 30.0], [-89.0, 27.0], [-92.0, 27.0]
        ]]
      }
    });

    storms.push({
      id: 'storm_2',
      type: 'Feature',
      properties: {
        headline: 'Tropical Storm Isaac - Category 1',
        description: 'Tropical Storm Isaac continues to strengthen over the Atlantic with winds of 65 mph.',
        severity: 'Moderate',
        event: 'Tropical Storm Warning',
        area_desc: 'Atlantic Ocean'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-78.0, 31.0], [-78.0, 34.0], [-75.0, 34.0], [-75.0, 31.0], [-78.0, 31.0]
        ]]
      }
    });

    return { balloons, storms };
  };

  // Filter balloons based on selected time
  const getFilteredBalloons = useCallback(() => {
    if (!balloons || selectedTime === 100) {
      return balloons;
    }

    const filteredBalloons = {};
    const timeRatio = selectedTime / 100;

    Object.entries(balloons).forEach(([id, balloon]) => {
      const trajectory = balloon.trajectory;
      const targetLength = Math.max(1, Math.floor(trajectory.length * timeRatio));

      filteredBalloons[id] = {
        ...balloon,
        trajectory: trajectory.slice(0, targetLength)
      };
    });

    return filteredBalloons;
  }, [balloons, selectedTime]);

  // Calculate proximity analysis
  useEffect(() => {
    if (!balloons || !storms) {
      setMonitoringBalloons([]);
      return;
    }

    const monitoring = [];
    const monitoringDistance = 100; // 100km

    Object.entries(balloons).forEach(([balloonId, balloon]) => {
      const isMonitoring = storms.some(storm => {
        if (!storm.geometry) return false;

        // Create a buffer around the storm area
        const stormPolygon = turf.polygon(storm.geometry.coordinates);
        const stormBuffer = turf.buffer(stormPolygon, monitoringDistance, { units: 'kilometers' });

        // Check if any point in the balloon trajectory is within the storm buffer
        return balloon.trajectory.some(point => {
          const balloonPoint = turf.point([point.lon, point.lat]);
          return turf.booleanPointInPolygon(balloonPoint, stormBuffer);
        });
      });

      if (isMonitoring) {
        monitoring.push(balloonId);
      }
    });

    setMonitoringBalloons(monitoring);
  }, [balloons, storms]);

  const handleTimeChange = useCallback((time) => {
    setSelectedTime(time);
  }, []);

  const handleFilterChange = useCallback((filters) => {
    setStormFilters(filters);
  }, []);

  const handleBalloonSelect = useCallback((balloonId) => {
    console.log('App: Balloon selected:', balloonId);
    setSelectedBalloonId(balloonId);
  }, []);

  const handleCloseTelemetry = useCallback(() => {
    setSelectedBalloonId(null);
  }, []);

  const handleCoverageToggle = useCallback(() => {
    setShowCoverage(prev => !prev);
  }, []);

  // Filter storms based on current filters
  const getFilteredStorms = useCallback(() => {
    if (!storms || stormFilters.showAll) {
      return storms;
    }

    return storms.filter(storm => {
      const severity = storm.properties?.severity || 'Unknown';
      const eventType = storm.properties?.event;

      const severityMatch = stormFilters.severity[severity] || false;
      const eventTypeMatch = eventType ? (stormFilters.eventType[eventType] || false) : true;

      return severityMatch && eventTypeMatch;
    });
  }, [storms, stormFilters]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="tornado-container">
          <div className="tornado">
            <div className="tornado-layer"></div>
            <div className="tornado-layer"></div>
            <div className="tornado-layer"></div>
            <div className="tornado-center"></div>
          </div>
        </div>
        <div className="loading-content">
          <h2>Hurricane Hunter Mission Control</h2>
          <p>Spinning up the weather balloon constellation...</p>
          <p className="loading-quirky-text">🌪️ Chasing storms with style since 2025</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Connection Failed</h2>
        <p>{error}</p>
        <p>Backend connection failed. Falling back to demo data.</p>
      </div>
    );
  }

  const filteredBalloons = getFilteredBalloons();
  const filteredStorms = getFilteredStorms();
  const selectedBalloon = selectedBalloonId && balloons ? balloons[selectedBalloonId] : null;
  const totalBalloons = balloons ? Object.keys(balloons).length : 0;
  const stationCount = traditionalStations ? traditionalStations.features?.length || 0 : 0;

  return (
    <div className="app">
      <LeafletMap
        balloons={filteredBalloons}
        storms={filteredStorms}
        traditionalStations={showCoverage ? traditionalStations : null}
        selectedTime={selectedTime}
        monitoringBalloons={monitoringBalloons}
        onBalloonSelect={handleBalloonSelect}
      />
      <InsightPanel
        balloons={filteredBalloons}
        storms={filteredStorms}
        monitoringBalloons={monitoringBalloons}
      />
      <TimeSlider onTimeChange={handleTimeChange} />
      <StormFilter
        storms={storms}
        onFilterChange={handleFilterChange}
      />
      <TelemetryInstructions totalBalloons={totalBalloons} />
      <CoverageToggle
        isActive={showCoverage}
        onToggle={handleCoverageToggle}
        stationCount={stationCount}
      />
      {selectedBalloon && (
        <TelemetryPanel
          balloon={selectedBalloon}
          isMonitoring={monitoringBalloons.includes(selectedBalloonId)}
          onClose={handleCloseTelemetry}
        />
      )}
    </div>
  );
}

export default App;
