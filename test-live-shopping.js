const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testLiveShoppingEndpoints() {
  console.log('🧪 Testing Live Shopping Endpoints...\n');

  try {
    // Test 1: Get all sessions
    console.log('1. Testing GET /live-shopping/sessions');
    const sessionsResponse = await axios.get(`${BASE_URL}/live-shopping/sessions`);
    console.log('✅ Success:', sessionsResponse.status);
    console.log('   Sessions count:', sessionsResponse.data.sessions?.length || 0);
    console.log('');

    // Test 2: Create a test session (this will fail without auth, but we can see the endpoint exists)
    console.log('2. Testing POST /live-shopping/sessions (without auth)');
    try {
      await axios.post(`${BASE_URL}/live-shopping/sessions`, {
        title: 'Test Session',
        description: 'Test Description',
        retailerId: 'test-id'
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Success: Endpoint exists, requires authentication (expected)');
      } else {
        console.log('❌ Unexpected error:', error.response?.status);
      }
    }
    console.log('');

    // Test 3: Test status update endpoint
    console.log('3. Testing PATCH /live-shopping/sessions/:id/status (without auth)');
    try {
      await axios.patch(`${BASE_URL}/live-shopping/sessions/test-id/status`, {
        status: 'live'
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Success: Endpoint exists, requires authentication (expected)');
      } else {
        console.log('❌ Unexpected error:', error.response?.status);
      }
    }
    console.log('');

    console.log('🎉 All endpoint tests completed!');

  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the tests
testLiveShoppingEndpoints();





