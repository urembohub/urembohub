const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.urembohub.com/api';

console.log('💳 Payment Callback POST Test');
console.log('=============================\n');

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

async function testPaymentCallbackWithPOST() {
  console.log('1. Testing Payment Callback with POST Method');
  console.log('============================================');
  
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
  
  // Test the payment callback endpoint with POST
  console.log('\nCalling payment callback endpoint with POST...');
  const callbackResult = await makeRequest(`/payments/callback/${testOrder.paystackReference}`, 'POST');
  
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

async function testPaystackCallbackRoute() {
  console.log('\n2. Testing Paystack Callback Route');
  console.log('===================================');
  
  // Check if there's a different callback route
  const paystackCallbackResult = await makeRequest('/paystack/callback/test-reference', 'POST');
  
  if (paystackCallbackResult.success) {
    console.log('✅ Paystack callback route accessible');
    console.log('Response:', paystackCallbackResult.data);
  } else {
    console.log('❌ Paystack callback route failed');
    console.log('Error:', paystackCallbackResult.error);
    console.log('Status:', paystackCallbackResult.status);
  }
}

async function checkAvailableRoutes() {
  console.log('\n3. Checking Available Routes');
  console.log('=============================');
  
  const routes = [
    '/payments',
    '/payments/initialize',
    '/payments/verify/test-reference',
    '/paystack',
    '/paystack/callback/test-reference',
    '/commission/settings',
    '/orders'
  ];
  
  for (const route of routes) {
    const result = await makeRequest(route);
    console.log(`${route}: ${result.success ? '✅' : '❌'} (${result.status || 'N/A'})`);
  }
}

async function main() {
  try {
    const testOrder = await testPaymentCallbackWithPOST();
    await testPaystackCallbackRoute();
    await checkAvailableRoutes();
    
    console.log('\n🎯 Payment Callback POST Test Summary');
    console.log('======================================');
    console.log('This test helps identify:');
    console.log('1. If payment callback endpoint accepts POST requests');
    console.log('2. If the correct callback route is being used');
    console.log('3. What routes are available and working');
    
    console.log('\nKey findings:');
    console.log('- Payment callback is defined as POST /payments/callback/:reference');
    console.log('- Commission processing happens in the payment callback');
    console.log('- If callback is not working, commissions won\'t be created');
    
    console.log('\nNext steps:');
    console.log('1. Check if Paystack webhook is calling the correct endpoint');
    console.log('2. Verify the callback endpoint is working with real Paystack data');
    console.log('3. Check server logs for callback processing messages');
    console.log('4. Test with a new payment transaction');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
