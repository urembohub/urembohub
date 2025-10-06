const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.urembohub.com/api';

console.log('🔍 Commission Data Mismatch Debug');
console.log('==================================\n');

async function makeRequest(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
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

async function checkCommissionAnalytics() {
  console.log('1. Checking Commission Analytics');
  console.log('================================');
  
  // Try to access commission analytics
  const result = await makeRequest('/commission/analytics/summary');
  
  if (result.success) {
    console.log('✅ Commission analytics retrieved');
    console.log('Analytics data:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Failed to retrieve commission analytics');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
  
  console.log('\n');
}

async function checkCommissionTransactions() {
  console.log('2. Checking Commission Transactions');
  console.log('===================================');
  
  const result = await makeRequest('/commission/transactions');
  
  if (result.success) {
    const transactions = result.data.transactions || result.data;
    console.log(`✅ Found ${transactions.length} commission transactions`);
    
    if (transactions.length > 0) {
      console.log('\nCommission transactions:');
      transactions.forEach((transaction, index) => {
        console.log(`  Transaction ${index + 1}:`);
        console.log(`    ID: ${transaction.id}`);
        console.log(`    Business User: ${transaction.businessUserId}`);
        console.log(`    Role: ${transaction.businessRole}`);
        console.log(`    Type: ${transaction.transactionType}`);
        console.log(`    Amount: KSh ${transaction.transactionAmount}`);
        console.log(`    Commission: KSh ${transaction.commissionAmount}`);
        console.log(`    Rate: ${transaction.commissionRate}%`);
        console.log(`    Status: ${transaction.paymentStatus}`);
        console.log(`    Created: ${transaction.createdAt}`);
        console.log('');
      });
      
      // Calculate totals by role
      const totalsByRole = {};
      let totalCommission = 0;
      
      transactions.forEach(transaction => {
        const role = transaction.businessRole;
        const commission = Number(transaction.commissionAmount);
        
        if (!totalsByRole[role]) {
          totalsByRole[role] = 0;
        }
        totalsByRole[role] += commission;
        totalCommission += commission;
      });
      
      console.log('Calculated totals:');
      console.log(`  Total Commission: KSh ${totalCommission}`);
      Object.entries(totalsByRole).forEach(([role, amount]) => {
        console.log(`  ${role}: KSh ${amount}`);
      });
      
    } else {
      console.log('No commission transactions found');
    }
  } else {
    console.log('❌ Failed to retrieve commission transactions');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
  
  console.log('\n');
}

async function checkDashboardData() {
  console.log('3. Checking Dashboard Data');
  console.log('==========================');
  
  const result = await makeRequest('/analytics/dashboard');
  
  if (result.success) {
    console.log('✅ Dashboard data retrieved');
    console.log('Dashboard data:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Failed to retrieve dashboard data');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
  
  console.log('\n');
}

async function checkCommissionSettings() {
  console.log('4. Checking Commission Settings');
  console.log('===============================');
  
  const result = await makeRequest('/commission/settings');
  
  if (result.success) {
    const settings = result.data;
    console.log('✅ Commission settings retrieved');
    console.log('Settings:', settings.map(s => `${s.role}: ${s.commissionRate}%`).join(', '));
  } else {
    console.log('❌ Failed to retrieve commission settings');
    console.log('Error:', result.error);
  }
  
  console.log('\n');
}

async function analyzeDataMismatch() {
  console.log('5. Analyzing Data Mismatch');
  console.log('===========================');
  
  console.log('Based on the dashboard image:');
  console.log('- Total Commission Paid: KSh 80.00');
  console.log('- Retailers Commission: KSh 336.00');
  console.log('- Vendors Commission: KSh 0.00');
  console.log('- Manufacturers Commission: KSh 0.00');
  console.log('');
  
  console.log('Issues identified:');
  console.log('1. Retailers (KSh 336.00) > Total (KSh 80.00) - This is impossible');
  console.log('2. The sum of individual roles should equal the total');
  console.log('3. There might be a calculation error in the frontend or backend');
  console.log('');
  
  console.log('Possible causes:');
  console.log('1. Different time periods being used for calculations');
  console.log('2. Different filtering criteria (e.g., payment status)');
  console.log('3. Currency conversion issues');
  console.log('4. Data aggregation errors');
  console.log('5. Caching issues with stale data');
  console.log('6. Different data sources being used');
  console.log('');
  
  console.log('Next steps to fix:');
  console.log('1. Check the frontend calculation logic');
  console.log('2. Verify the backend API responses');
  console.log('3. Check if different time periods are being used');
  console.log('4. Verify data filtering criteria');
  console.log('5. Check for caching issues');
}

async function main() {
  try {
    await checkCommissionAnalytics();
    await checkCommissionTransactions();
    await checkDashboardData();
    await checkCommissionSettings();
    await analyzeDataMismatch();
    
    console.log('\n🎯 Data Mismatch Analysis Summary');
    console.log('==================================');
    console.log('The commission data shows a clear inconsistency:');
    console.log('- Total: KSh 80.00');
    console.log('- Retailers: KSh 336.00 (impossible!)');
    console.log('');
    console.log('This suggests:');
    console.log('1. Different calculation methods for total vs. individual roles');
    console.log('2. Different time periods or filtering criteria');
    console.log('3. Data aggregation errors in the frontend or backend');
    console.log('4. Possible caching issues');
    console.log('');
    console.log('To fix this:');
    console.log('1. Check the frontend calculation logic');
    console.log('2. Verify backend API responses are consistent');
    console.log('3. Ensure same time periods and filters are used');
    console.log('4. Check for data caching issues');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

main();
