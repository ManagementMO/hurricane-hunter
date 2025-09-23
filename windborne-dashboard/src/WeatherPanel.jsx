import { useState, useEffect } from 'react'

const WeatherPanel = ({ weatherData, mapCenter }) => {
  const [forecast, setForecast] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (mapCenter) {
      fetchForecastData(mapCenter[1], mapCenter[0])
    }
  }, [mapCenter])

  const fetchForecastData = async (lat, lon) => {
    try {
      setIsLoading(true)
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY
      if (!apiKey) return

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=8`
      )

      if (response.ok) {
        const data = await response.json()
        setForecast(data)
      }
    } catch (err) {
      console.warn('Failed to fetch forecast data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getWeatherIcon = (code) => {
    const iconMap = {
      '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️',
      '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
      '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
      '11d': '⛈️', '11n': '⛈️', '13d': '🌨️', '13n': '🌨️',
      '50d': '🌫️', '50n': '🌫️'
    }
    return iconMap[code] || '🌤️'
  }

  const getWindDirection = (degrees) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
    const index = Math.round(degrees / 22.5) % 16
    return directions[index]
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!weatherData && !forecast) {
    return (
      <div className="weather-panel">
        <div className="panel-header">
          <h3>Weather Conditions</h3>
          <div className="weather-status">No API Key</div>
        </div>
        <div className="weather-message">
          <p>Add OpenWeatherMap API key to .env to enable weather data:</p>
          <code>VITE_OPENWEATHER_API_KEY=your_key_here</code>
          <p><small>I chose OpenWeatherMap because it provides comprehensive weather data that's essential for balloon tracking missions - including wind patterns, pressure systems, and severe weather alerts that could affect flight paths.</small></p>
        </div>
      </div>
    )
  }

  return (
    <div className="weather-panel">
      <div className="panel-header">
        <h3>Weather Conditions</h3>
        <div className="weather-status">Live</div>
      </div>

      {weatherData && (
        <div className="current-weather">
          <div className="weather-main">
            <div className="weather-icon-large">
              {getWeatherIcon(weatherData.weather[0].icon)}
            </div>
            <div className="weather-info">
              <div className="temperature">{Math.round(weatherData.main.temp)}°C</div>
              <div className="description">{weatherData.weather[0].description}</div>
              <div className="location">{weatherData.name}</div>
            </div>
          </div>

          <div className="weather-details">
            <div className="weather-detail">
              <span className="detail-label">Feels like</span>
              <span className="detail-value">{Math.round(weatherData.main.feels_like)}°C</span>
            </div>
            <div className="weather-detail">
              <span className="detail-label">Humidity</span>
              <span className="detail-value">{weatherData.main.humidity}%</span>
            </div>
            <div className="weather-detail">
              <span className="detail-label">Pressure</span>
              <span className="detail-value">{weatherData.main.pressure} hPa</span>
            </div>
            <div className="weather-detail">
              <span className="detail-label">Visibility</span>
              <span className="detail-value">{weatherData.visibility / 1000} km</span>
            </div>
          </div>

          {weatherData.wind && (
            <div className="wind-info">
              <div className="wind-header">
                <span className="wind-icon">💨</span>
                <span>Wind Conditions</span>
              </div>
              <div className="wind-details">
                <div className="wind-speed">
                  <span className="wind-value">{Math.round(weatherData.wind.speed * 3.6)}</span>
                  <span className="wind-unit">km/h</span>
                </div>
                <div className="wind-direction">
                  <span className="direction-arrow" style={{
                    transform: `rotate(${weatherData.wind.deg}deg)`
                  }}>↑</span>
                  <span>{getWindDirection(weatherData.wind.deg)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {forecast && (
        <div className="forecast">
          <div className="forecast-header">
            <h4>24h Forecast</h4>
          </div>
          <div className="forecast-list">
            {forecast.list.slice(0, 6).map((item, index) => (
              <div key={index} className="forecast-item">
                <div className="forecast-time">{formatTime(item.dt)}</div>
                <div className="forecast-icon">{getWeatherIcon(item.weather[0].icon)}</div>
                <div className="forecast-temp">{Math.round(item.main.temp)}°</div>
                <div className="forecast-desc">{item.weather[0].main}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="weather-alerts">
        <div className="alert-header">
          <span className="alert-icon">⚠️</span>
          <span>Flight Conditions</span>
        </div>
        <div className="condition-indicators">
          <div className={`condition ${weatherData?.wind?.speed > 10 ? 'warning' : 'good'}`}>
            <span>Wind Speed</span>
            <span>{weatherData?.wind?.speed > 10 ? 'High' : 'Normal'}</span>
          </div>
          <div className={`condition ${weatherData?.main?.pressure < 1000 ? 'warning' : 'good'}`}>
            <span>Pressure</span>
            <span>{weatherData?.main?.pressure < 1000 ? 'Low' : 'Stable'}</span>
          </div>
          <div className={`condition ${weatherData?.visibility < 5000 ? 'warning' : 'good'}`}>
            <span>Visibility</span>
            <span>{weatherData?.visibility < 5000 ? 'Poor' : 'Good'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WeatherPanel