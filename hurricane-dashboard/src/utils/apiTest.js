import { API_ENDPOINTS } from '../config';

/**
 * Test API endpoints to verify they're working
 */
export const testApiEndpoints = async () => {
  const results = {
    health: { status: 'untested', error: null },
    balloons: { status: 'untested', error: null },
    storms: { status: 'untested', error: null }
  };

  // Test health endpoint
  try {
    const response = await fetch(API_ENDPOINTS.health);
    if (response.ok) {
      const data = await response.json();
      results.health = { status: 'success', data };
    } else {
      results.health = { status: 'error', error: `HTTP ${response.status}` };
    }
  } catch (error) {
    results.health = { status: 'error', error: error.message };
  }

  // Test balloons endpoint
  try {
    const response = await fetch(API_ENDPOINTS.balloons);
    if (response.ok) {
      const data = await response.json();
      results.balloons = {
        status: 'success',
        data: { balloonCount: Object.keys(data).length }
      };
    } else {
      results.balloons = { status: 'error', error: `HTTP ${response.status}` };
    }
  } catch (error) {
    results.balloons = { status: 'error', error: error.message };
  }

  // Test storms endpoint
  try {
    const response = await fetch(API_ENDPOINTS.storms);
    if (response.ok) {
      const data = await response.json();
      results.storms = {
        status: 'success',
        data: { stormCount: data.length }
      };
    } else {
      results.storms = { status: 'error', error: `HTTP ${response.status}` };
    }
  } catch (error) {
    results.storms = { status: 'error', error: error.message };
  }

  return results;
};

/**
 * Log API test results to console
 */
export const logApiTestResults = async () => {
  console.log('🧪 Testing API endpoints...');
  const results = await testApiEndpoints();

  console.log('📊 API Test Results:');
  console.table(results);

  const allWorking = Object.values(results).every(r => r.status === 'success');
  console.log(allWorking ? '✅ All endpoints working!' : '⚠️  Some endpoints have issues');

  return results;
};