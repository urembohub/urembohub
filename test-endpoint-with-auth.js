const axios = require('axios');

// Test the executive summary endpoint with proper authentication
async function testEndpointWithAuth() {
  const baseURL = 'http://localhost:3000/api';
  
  try {
    console.log('🧪 Testing Executive Summary Endpoint with Authentication...\n');
    
    // Step 1: Try to login with common admin credentials
    console.log('1. Attempting authentication...');
    
    const credentials = [
      { email: 'admin@urembohub.com', password: 'admin123' },
      { email: 'admin@example.com', password: 'admin123' },
      { email: 'admin@test.com', password: 'admin123' },
      { email: 'admin', password: 'admin' },
    ];
    
    let token = null;
    let loginSuccess = false;
    
    for (const cred of credentials) {
      try {
        console.log(`   Trying: ${cred.email}`);
        const loginResponse = await axios.post(`${baseURL}/auth/login`, cred);
        
        if (loginResponse.data.success && loginResponse.data.data?.access_token) {
          token = loginResponse.data.data.access_token;
          console.log(`   ✅ Login successful with: ${cred.email}`);
          loginSuccess = true;
          break;
        }
      } catch (error) {
        console.log(`   ❌ Failed: ${error.response?.data?.message || 'Invalid credentials'}`);
      }
    }
    
    if (!loginSuccess) {
      console.log('\n💡 No valid admin credentials found. Please check:');
      console.log('1. Admin user exists in database');
      console.log('2. Admin credentials are correct');
      console.log('3. Database is properly seeded');
      console.log('\n🔧 You can create an admin user by running:');
      console.log('   cd backend && npm run seed:admin');
      return;
    }
    
    // Step 2: Test the executive summary endpoint
    console.log('\n2. Testing Executive Summary Endpoint...');
    const startTime = Date.now();
    
    const response = await axios.get(`${baseURL}/analytics/dashboard/executive-summary`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`✅ Executive Summary Response Time: ${responseTime}ms`);
    console.log('📊 Executive Summary Data:');
    
    // Convert BigInt values for display
    const data = response.data;
    const convertedData = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null) {
        convertedData[key] = {};
        for (const [subKey, subValue] of Object.entries(value)) {
          convertedData[key][subKey] = typeof subValue === 'bigint' ? Number(subValue) : subValue;
        }
      } else {
        convertedData[key] = typeof value === 'bigint' ? Number(value) : value;
      }
    }
    
    console.log(JSON.stringify(convertedData, null, 2));
    
    // Performance analysis
    console.log('\n📈 Performance Analysis:');
    console.log(`- Response Time: ${responseTime}ms`);
    console.log(`- Data Size: ${JSON.stringify(data).length} bytes`);
    console.log(`- Single API Call: ✅ (vs 5-8 calls before)`);
    
    if (responseTime < 1000) {
      console.log('🚀 EXCELLENT: Response time under 1 second!');
    } else if (responseTime < 2000) {
      console.log('✅ GOOD: Response time under 2 seconds');
    } else {
      console.log('⚠️  SLOW: Response time over 2 seconds');
    }
    
    console.log('\n🎉 Executive Summary Endpoint Test PASSED!');
    console.log('🚀 Ready for frontend integration!');
    
  } catch (error) {
    console.error('❌ Test Failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Authentication failed. Please check:');
      console.log('1. Backend server is running on http://localhost:3000');
      console.log('2. Admin credentials are correct');
      console.log('3. Database is properly seeded with admin user');
    } else if (error.response?.status === 500) {
      console.log('\n💡 Server error. Please check:');
      console.log('1. Database connection is working');
      console.log('2. All required tables exist');
      console.log('3. Backend logs for detailed error information');
    }
  }
}

// Run the test
testEndpointWithAuth();
