const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.urembohub.com/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

console.log('🔍 Commission API Response Test');
console.log('================================\n');

async function makeRequest(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

async function testCommissionAnalyticsWithAuth() {
  console.log('1. Testing Commission Analytics with Auth');
  console.log('=========================================');
  
  if (!AUTH_TOKEN) {
    console.log('❌ No auth token provided');
    console.log('Set AUTH_TOKEN environment variable to test with authentication');
    console.log('Example: export AUTH_TOKEN="your-jwt-token-here"');
    return null;
  }
  
  const result = await makeRequest('/commission/analytics/dashboard');
  
  if (result.success) {
    console.log('✅ Commission analytics retrieved with auth');
    console.log('Response structure:');
    console.log(JSON.stringify(result.data, null, 2));
    
    // Analyze the data structure
    const data = result.data;
    console.log('\nData Analysis:');
    console.log(`Total Commission Paid: ${data.summary?.totalCommissionPaid || 'N/A'}`);
    console.log(`Monthly Commission: ${data.summary?.monthlyCommission || 'N/A'}`);
    console.log(`Transaction Count: ${data.summary?.transactionCount || 'N/A'}`);
    console.log(`Vendor Commission: ${data.byRole?.vendor || 'N/A'}`);
    console.log(`Retailer Commission: ${data.byRole?.retailer || 'N/A'}`);
    console.log(`Manufacturer Commission: ${data.byRole?.manufacturer || 'N/A'}`);
    
    // Check for data consistency
    const totalFromSummary = data.summary?.totalCommissionPaid || 0;
    const totalFromRoles = (data.byRole?.vendor || 0) + (data.byRole?.retailer || 0) + (data.byRole?.manufacturer || 0);
    
    console.log('\nConsistency Check:');
    console.log(`Total from summary: ${totalFromSummary}`);
    console.log(`Total from roles: ${totalFromRoles}`);
    console.log(`Consistent: ${totalFromSummary === totalFromRoles ? '✅' : '❌'}`);
    
    if (totalFromSummary !== totalFromRoles) {
      console.log('❌ DATA MISMATCH DETECTED!');
      console.log('The total commission and sum of individual roles do not match');
    }
    
    return data;
  } else {
    console.log('❌ Failed to retrieve commission analytics with auth');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
    return null;
  }
}

async function testCommissionAnalyticsWithoutAuth() {
  console.log('\n2. Testing Commission Analytics without Auth');
  console.log('============================================');
  
  const result = await makeRequest('/commission/analytics/dashboard');
  
  if (result.success) {
    console.log('✅ Commission analytics retrieved without auth');
    console.log('Response:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Failed to retrieve commission analytics without auth');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
}

async function testCommissionTransactions() {
  console.log('\n3. Testing Commission Transactions');
  console.log('===================================');
  
  const result = await makeRequest('/commission/transactions');
  
  if (result.success) {
    const transactions = result.data.transactions || result.data;
    console.log(`✅ Found ${transactions.length} commission transactions`);
    
    if (transactions.length > 0) {
      // Calculate totals manually
      let totalCommission = 0;
      const byRole = { vendor: 0, retailer: 0, manufacturer: 0 };
      
      transactions.forEach(transaction => {
        const amount = Number(transaction.commissionAmount);
        totalCommission += amount;
        
        const role = transaction.businessRole;
        if (role in byRole) {
          byRole[role] += amount;
        }
      });
      
      console.log('\nManual Calculation:');
      console.log(`Total Commission: ${totalCommission}`);
      console.log(`Vendor: ${byRole.vendor}`);
      console.log(`Retailer: ${byRole.retailer}`);
      console.log(`Manufacturer: ${byRole.manufacturer}`);
    }
  } else {
    console.log('❌ Failed to retrieve commission transactions');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
}

async function analyzeDataMismatch() {
  console.log('\n4. Analyzing Data Mismatch');
  console.log('===========================');
  
  console.log('Based on your dashboard image:');
  console.log('- Total Commission Paid: KSh 80.00');
  console.log('- Retailers Commission: KSh 336.00');
  console.log('- Vendors Commission: KSh 0.00');
  console.log('- Manufacturers Commission: KSh 0.00');
  console.log('');
  
  console.log('Possible causes:');
  console.log('1. Different time periods for total vs. individual roles');
  console.log('2. Different filtering criteria (e.g., payment status)');
  console.log('3. Caching issues with stale data');
  console.log('4. Frontend calculation errors');
  console.log('5. Backend aggregation errors');
  console.log('6. Different data sources being used');
  console.log('');
  
  console.log('The fact that retailers (336) > total (80) suggests:');
  console.log('- The total might be using a different filter (e.g., only completed payments)');
  console.log('- The individual roles might be using a different filter (e.g., all payments)');
  console.log('- There might be a calculation error in the frontend or backend');
}

async function main() {
  try {
    const analyticsData = await testCommissionAnalyticsWithAuth();
    await testCommissionAnalyticsWithoutAuth();
    await testCommissionTransactions();
    await analyzeDataMismatch();
    
    console.log('\n🎯 Commission API Response Test Summary');
    console.log('=======================================');
    console.log('This test helps identify:');
    console.log('1. What data the API actually returns');
    console.log('2. Whether there are data consistency issues');
    console.log('3. If authentication is required for accurate data');
    console.log('4. The source of the data mismatch');
    
    if (analyticsData) {
      console.log('\nKey findings:');
      console.log('- API response structure has been analyzed');
      console.log('- Data consistency has been checked');
      console.log('- Any mismatches have been identified');
    } else {
      console.log('\nTo get accurate data:');
      console.log('1. Provide an auth token: export AUTH_TOKEN="your-token"');
      console.log('2. Run this test again to see real data');
      console.log('3. Check the actual API responses');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
