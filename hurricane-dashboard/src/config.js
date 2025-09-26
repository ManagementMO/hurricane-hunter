// API Configuration
const API_CONFIG = {
  development: {
    baseUrl: 'http://localhost:8000',
  },
  production: {
    baseUrl: 'https://hurricane-hunter-backend.vercel.app',
  }
};

// Determine environment
const isDevelopment = import.meta.env.DEV;
const environment = isDevelopment ? 'development' : 'production';

export const API_BASE_URL = API_CONFIG[environment].baseUrl;

export const API_ENDPOINTS = {
  balloons: `${API_BASE_URL}/api/balloons/history`,
  storms: `${API_BASE_URL}/api/storms`,
  traditionalStations: `${API_BASE_URL}/api/traditional-stations`,
  health: `${API_BASE_URL}/health`
};

export { isDevelopment };