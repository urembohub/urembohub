const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.urembohub.com/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

console.log('🔍 Commission System Debug Script');
console.log('=====================================\n');

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

async function testCommissionSettings() {
  console.log('1. Testing Commission Settings');
  console.log('==============================');
  
  const result = await makeRequest('/commission/settings');
  
  if (result.success) {
    console.log('✅ Commission settings retrieved successfully');
    console.log('Settings:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Failed to retrieve commission settings');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
  
  console.log('\n');
}

async function testCommissionCalculation() {
  console.log('2. Testing Commission Calculation');
  console.log('==================================');
  
  const testCases = [
    { transactionAmount: 1000, role: 'retailer', businessUserId: 'test-retailer-id' },
    { transactionAmount: 500, role: 'vendor', businessUserId: 'test-vendor-id' },
    { transactionAmount: 2000, role: 'manufacturer', businessUserId: 'test-manufacturer-id' }
  ];
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.role} - KSh ${testCase.transactionAmount}`);
    
    const result = await makeRequest('/commission/calculate', 'POST', testCase);
    
    if (result.success) {
      console.log('✅ Calculation successful');
      console.log('Result:', JSON.stringify(result.data, null, 2));
    } else {
      console.log('❌ Calculation failed');
      console.log('Error:', result.error);
      console.log('Status:', result.status);
    }
    console.log('');
  }
}

async function testRecentOrders() {
  console.log('3. Testing Recent Orders');
  console.log('========================');
  
  const result = await makeRequest('/orders');
  
  if (result.success) {
    console.log('✅ Orders retrieved successfully');
    const orders = result.data.data || result.data;
    console.log(`Found ${orders.length} orders`);
    
    // Show recent orders with payment status
    const recentOrders = orders.slice(0, 5);
    recentOrders.forEach((order, index) => {
      console.log(`Order ${index + 1}:`);
      console.log(`  ID: ${order.id}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Payment Status: ${order.paymentStatus}`);
      console.log(`  Total: KSh ${order.totalAmount}`);
      console.log(`  Created: ${order.createdAt}`);
      console.log('');
    });
  } else {
    console.log('❌ Failed to retrieve orders');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
}

async function testCommissionTransactions() {
  console.log('4. Testing Commission Transactions');
  console.log('===================================');
  
  const result = await makeRequest('/commission/transactions');
  
  if (result.success) {
    console.log('✅ Commission transactions retrieved successfully');
    const transactions = result.data.transactions || result.data;
    console.log(`Found ${transactions.length} commission transactions`);
    
    // Show recent transactions
    const recentTransactions = transactions.slice(0, 5);
    recentTransactions.forEach((transaction, index) => {
      console.log(`Transaction ${index + 1}:`);
      console.log(`  ID: ${transaction.id}`);
      console.log(`  Business User: ${transaction.businessUserId}`);
      console.log(`  Role: ${transaction.businessRole}`);
      console.log(`  Type: ${transaction.transactionType}`);
      console.log(`  Amount: KSh ${transaction.transactionAmount}`);
      console.log(`  Commission: KSh ${transaction.commissionAmount}`);
      console.log(`  Rate: ${transaction.commissionRate}%`);
      console.log(`  Status: ${transaction.paymentStatus}`);
      console.log(`  Created: ${transaction.createdAt}`);
      console.log('');
    });
  } else {
    console.log('❌ Failed to retrieve commission transactions');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
}

async function testPaymentCallback() {
  console.log('5. Testing Payment Callback Simulation');
  console.log('======================================');
  
  // This would simulate a payment callback
  console.log('Note: This would require a real payment reference from Paystack');
  console.log('To test this, you would need to:');
  console.log('1. Make a real payment through the frontend');
  console.log('2. Get the payment reference from Paystack');
  console.log('3. Call the callback endpoint with that reference');
  console.log('');
}

async function testDatabaseConnection() {
  console.log('6. Testing Database Connection');
  console.log('==============================');
  
  // Test if we can access basic data
  const result = await makeRequest('/analytics/dashboard');
  
  if (result.success) {
    console.log('✅ Database connection successful');
    console.log('Dashboard data retrieved');
  } else {
    console.log('❌ Database connection failed');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
  
  console.log('\n');
}

async function main() {
  try {
    await testCommissionSettings();
    await testCommissionCalculation();
    await testRecentOrders();
    await testCommissionTransactions();
    await testPaymentCallback();
    await testDatabaseConnection();
    
    console.log('🎯 Debug Summary');
    console.log('================');
    console.log('Check the results above to identify issues with:');
    console.log('1. Commission settings configuration');
    console.log('2. Commission calculation logic');
    console.log('3. Order processing and payment status');
    console.log('4. Commission transaction creation');
    console.log('5. Database connectivity');
    console.log('\nNext steps:');
    console.log('- Fix any configuration issues found');
    console.log('- Test with a real payment transaction');
    console.log('- Check server logs for detailed error messages');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

main();
