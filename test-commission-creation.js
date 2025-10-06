const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.urembohub.com/api';

console.log('💰 Commission Creation Test');
console.log('===========================\n');

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

async function testPaymentCallbackWithRealReference() {
  console.log('1. Testing Payment Callback with Real Reference');
  console.log('===============================================');
  
  // Get a recent paid order to get its Paystack reference
  const ordersResult = await makeRequest('/orders');
  
  if (!ordersResult.success) {
    console.log('❌ Failed to retrieve orders');
    return;
  }
  
  const orders = ordersResult.data.data || ordersResult.data;
  const paidOrders = orders.filter(order => order.paymentStatus === 'paid' && order.paystackReference);
  
  if (paidOrders.length === 0) {
    console.log('❌ No paid orders with Paystack reference found');
    return;
  }
  
  const testOrder = paidOrders[0];
  console.log(`Testing with order: ${testOrder.id}`);
  console.log(`Paystack reference: ${testOrder.paystackReference}`);
  console.log(`Total amount: KSh ${testOrder.totalAmount}`);
  
  // Test the payment callback endpoint
  console.log('\nCalling payment callback endpoint...');
  const callbackResult = await makeRequest(`/payments/callback/${testOrder.paystackReference}`);
  
  if (callbackResult.success) {
    console.log('✅ Payment callback successful');
    console.log('Response:', JSON.stringify(callbackResult.data, null, 2));
  } else {
    console.log('❌ Payment callback failed');
    console.log('Error:', callbackResult.error);
    console.log('Status:', callbackResult.status);
  }
  
  return testOrder;
}

async function checkCommissionTransactionsAfterCallback() {
  console.log('\n2. Checking Commission Transactions After Callback');
  console.log('===================================================');
  
  // Try to access commission transactions (this might fail due to auth)
  const result = await makeRequest('/commission/transactions');
  
  if (result.success) {
    const transactions = result.data.transactions || result.data;
    console.log(`✅ Found ${transactions.length} commission transactions`);
    
    if (transactions.length > 0) {
      console.log('\nRecent commission transactions:');
      transactions.slice(0, 5).forEach((transaction, index) => {
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
    }
  } else {
    console.log('❌ Failed to retrieve commission transactions');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
    console.log('\nThis is expected if authentication is required.');
    console.log('The commission transactions might still be created in the database.');
  }
}

async function testCommissionCalculationDirectly() {
  console.log('\n3. Testing Commission Calculation Directly');
  console.log('==========================================');
  
  // Test commission calculation without auth (this might fail)
  const testCases = [
    { transactionAmount: 1000, role: 'retailer' },
    { transactionAmount: 500, role: 'vendor' },
    { transactionAmount: 2000, role: 'manufacturer' }
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

async function analyzePaymentFlow() {
  console.log('\n4. Analyzing Payment Flow');
  console.log('==========================');
  
  console.log('Based on the code analysis:');
  console.log('1. Payment callback includes product.retailer relation ✅');
  console.log('2. Commission processing is called after payment callback ✅');
  console.log('3. Commission settings are configured ✅');
  console.log('4. Enhanced commission service is injected ✅');
  
  console.log('\nPossible issues:');
  console.log('1. Commission processing might be failing silently');
  console.log('2. Database transaction might be rolling back');
  console.log('3. Commission service might have errors');
  console.log('4. Paystack reference might not be found');
  console.log('5. Order might not have the expected structure');
  
  console.log('\nTo debug further:');
  console.log('1. Check server logs for commission processing messages');
  console.log('2. Test with a new payment transaction');
  console.log('3. Check database directly for commission transactions');
  console.log('4. Verify Paystack webhook is calling the callback endpoint');
}

async function main() {
  try {
    const testOrder = await testPaymentCallbackWithRealReference();
    await checkCommissionTransactionsAfterCallback();
    await testCommissionCalculationDirectly();
    await analyzePaymentFlow();
    
    console.log('\n🎯 Commission Creation Test Summary');
    console.log('===================================');
    console.log('This test helps identify:');
    console.log('1. If payment callback is working');
    console.log('2. If commission transactions are being created');
    console.log('3. If commission calculations are working');
    console.log('4. If the payment flow is set up correctly');
    
    if (testOrder) {
      console.log('\nNext steps:');
      console.log('1. Check server logs for commission processing messages');
      console.log('2. Test with a new payment transaction');
      console.log('3. Check database directly for commission transactions');
      console.log('4. Verify Paystack webhook is calling the callback endpoint');
      console.log('5. Test with a real payment reference from Paystack');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
