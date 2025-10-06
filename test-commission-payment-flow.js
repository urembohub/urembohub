const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.urembohub.com/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

console.log('💳 Commission Payment Flow Test');
console.log('===============================\n');

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

async function testPaymentInitialization() {
  console.log('1. Testing Payment Initialization');
  console.log('==================================');
  
  // This would test the payment initialization endpoint
  // You would need to provide real order data
  console.log('To test payment initialization:');
  console.log('1. Create a test order with products/services');
  console.log('2. Call the payment initialization endpoint');
  console.log('3. Verify commission calculation is included');
  console.log('4. Check Paystack subaccount configuration');
  console.log('');
  
  // Example of what the request would look like
  const exampleOrder = {
    orderId: 'test-order-123',
    amount: 1000,
    currency: 'KES',
    items: [
      {
        productId: 'product-123',
        quantity: 1,
        price: 1000,
        retailerId: 'retailer-123'
      }
    ]
  };
  
  console.log('Example order data for testing:');
  console.log(JSON.stringify(exampleOrder, null, 2));
  console.log('');
}

async function testPaymentCallback() {
  console.log('2. Testing Payment Callback');
  console.log('============================');
  
  console.log('To test payment callback:');
  console.log('1. Make a real payment through Paystack');
  console.log('2. Get the payment reference from Paystack');
  console.log('3. Call the callback endpoint with that reference');
  console.log('4. Verify commission transactions are created');
  console.log('');
  
  // Example callback data structure
  const exampleCallback = {
    reference: 'paystack-ref-123',
    status: 'success',
    amount: 1000,
    currency: 'KES',
    customer: {
      email: 'test@example.com'
    }
  };
  
  console.log('Example callback data:');
  console.log(JSON.stringify(exampleCallback, null, 2));
  console.log('');
}

async function testCommissionTransactionCreation() {
  console.log('3. Testing Commission Transaction Creation');
  console.log('==========================================');
  
  // Test creating a commission transaction manually
  const testTransaction = {
    businessUserId: 'test-user-123',
    businessRole: 'retailer',
    transactionType: 'product_sale',
    transactionId: 'test-order-123',
    transactionAmount: 1000,
    commissionRate: 8.0,
    commissionAmount: 80,
    paymentStatus: 'pending',
    metadata: {
      orderId: 'test-order-123',
      productId: 'product-123',
      productName: 'Test Product',
      processedAt: new Date().toISOString()
    }
  };
  
  console.log('Testing commission transaction creation...');
  console.log('Transaction data:', JSON.stringify(testTransaction, null, 2));
  
  const result = await makeRequest('/commission/transactions', 'POST', testTransaction);
  
  if (result.success) {
    console.log('✅ Commission transaction created successfully');
    console.log('Created transaction:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Failed to create commission transaction');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
  
  console.log('\n');
}

async function testCommissionProcessing() {
  console.log('4. Testing Commission Processing');
  console.log('=================================');
  
  // Test processing a commission transaction
  const processData = {
    transactionId: 'test-order-123',
    businessUserId: 'test-user-123',
    businessRole: 'retailer',
    transactionAmount: 1000
  };
  
  console.log('Testing commission processing...');
  console.log('Process data:', JSON.stringify(processData, null, 2));
  
  const result = await makeRequest('/commission/process-transaction', 'POST', processData);
  
  if (result.success) {
    console.log('✅ Commission processing successful');
    console.log('Result:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Failed to process commission');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
  
  console.log('\n');
}

async function testCommissionAnalytics() {
  console.log('5. Testing Commission Analytics');
  console.log('===============================');
  
  const result = await makeRequest('/commission/analytics/summary');
  
  if (result.success) {
    console.log('✅ Commission analytics retrieved successfully');
    console.log('Analytics data:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Failed to retrieve commission analytics');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
  
  console.log('\n');
}

async function testDatabaseQueries() {
  console.log('6. Testing Database Queries');
  console.log('============================');
  
  // Test various database queries that the commission system uses
  const queries = [
    '/commission/settings',
    '/commission/transactions',
    '/orders',
    '/analytics/dashboard'
  ];
  
  for (const query of queries) {
    console.log(`Testing query: ${query}`);
    const result = await makeRequest(query);
    
    if (result.success) {
      console.log('✅ Query successful');
      const data = result.data;
      if (Array.isArray(data)) {
        console.log(`  Found ${data.length} records`);
      } else if (data && typeof data === 'object') {
        console.log(`  Retrieved object with ${Object.keys(data).length} properties`);
      }
    } else {
      console.log('❌ Query failed');
      console.log('  Error:', result.error);
      console.log('  Status:', result.status);
    }
    console.log('');
  }
}

async function main() {
  try {
    await testPaymentInitialization();
    await testPaymentCallback();
    await testCommissionTransactionCreation();
    await testCommissionProcessing();
    await testCommissionAnalytics();
    await testDatabaseQueries();
    
    console.log('🎯 Payment Flow Test Summary');
    console.log('=============================');
    console.log('Check the results above to identify issues with:');
    console.log('1. Payment initialization and commission calculation');
    console.log('2. Payment callback processing');
    console.log('3. Commission transaction creation');
    console.log('4. Commission processing logic');
    console.log('5. Analytics and reporting');
    console.log('6. Database connectivity and queries');
    console.log('\nNext steps:');
    console.log('- Fix any configuration issues found');
    console.log('- Test with real payment transactions');
    console.log('- Check server logs for detailed error messages');
    console.log('- Verify Paystack integration is working correctly');
    console.log('- Test commission calculation accuracy');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
