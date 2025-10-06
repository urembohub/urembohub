const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.urembohub.com/api';

console.log('💳 Payment Callback Test');
console.log('========================\n');

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

async function testPaymentCallback() {
  console.log('1. Testing Payment Callback');
  console.log('============================');
  
  // First, let's get a recent paid order
  const ordersResult = await makeRequest('/orders');
  
  if (!ordersResult.success) {
    console.log('❌ Failed to retrieve orders');
    console.log('Error:', ordersResult.error);
    return;
  }
  
  const orders = ordersResult.data.data || ordersResult.data;
  const paidOrders = orders.filter(order => order.paymentStatus === 'paid');
  
  if (paidOrders.length === 0) {
    console.log('❌ No paid orders found to test callback');
    return;
  }
  
  const testOrder = paidOrders[0];
  console.log(`Testing with order: ${testOrder.id}`);
  console.log(`Order total: KSh ${testOrder.totalAmount}`);
  console.log(`Payment status: ${testOrder.paymentStatus}`);
  
  // Check if this order has commission transactions before callback
  console.log('\n2. Checking Commission Transactions Before Callback');
  console.log('====================================================');
  
  // We can't access commission transactions without auth, so let's check the order details
  console.log('Order details:');
  console.log(`  ID: ${testOrder.id}`);
  console.log(`  Status: ${testOrder.status}`);
  console.log(`  Payment Status: ${testOrder.paymentStatus}`);
  console.log(`  Total: KSh ${testOrder.totalAmount}`);
  console.log(`  Created: ${testOrder.createdAt}`);
  
  if (testOrder.orderItems && testOrder.orderItems.length > 0) {
    console.log('\nOrder items:');
    testOrder.orderItems.forEach((item, index) => {
      console.log(`  Item ${index + 1}:`);
      console.log(`    Product: ${item.product?.name || 'Unknown'}`);
      console.log(`    Price: KSh ${item.totalPrice}`);
      console.log(`    Retailer: ${item.product?.retailer?.email || 'Unknown'}`);
      console.log(`    Retailer Role: ${item.product?.retailer?.role || 'Unknown'}`);
    });
  }
  
  // Test the payment callback endpoint
  console.log('\n3. Testing Payment Callback Endpoint');
  console.log('=====================================');
  
  // We need a Paystack reference to test the callback
  // For now, let's just test if the endpoint exists
  const callbackResult = await makeRequest(`/payments/callback/test-reference-123`);
  
  if (callbackResult.success) {
    console.log('✅ Payment callback endpoint is accessible');
    console.log('Response:', callbackResult.data);
  } else {
    console.log('❌ Payment callback endpoint failed');
    console.log('Error:', callbackResult.error);
    console.log('Status:', callbackResult.status);
  }
}

async function testCommissionServiceDirectly() {
  console.log('\n4. Testing Commission Service Directly');
  console.log('======================================');
  
  // Test if we can access commission settings (this should work without auth)
  const settingsResult = await makeRequest('/commission/settings');
  
  if (settingsResult.success) {
    console.log('✅ Commission settings accessible');
    const settings = settingsResult.data;
    console.log('Settings:', settings.map(s => `${s.role}: ${s.commissionRate}%`).join(', '));
  } else {
    console.log('❌ Commission settings not accessible');
    console.log('Error:', settingsResult.error);
  }
}

async function analyzeOrderData() {
  console.log('\n5. Analyzing Order Data');
  console.log('========================');
  
  const ordersResult = await makeRequest('/orders');
  
  if (!ordersResult.success) {
    console.log('❌ Failed to retrieve orders');
    return;
  }
  
  const orders = ordersResult.data.data || ordersResult.data;
  const paidOrders = orders.filter(order => order.paymentStatus === 'paid');
  
  console.log(`Total orders: ${orders.length}`);
  console.log(`Paid orders: ${paidOrders.length}`);
  
  if (paidOrders.length > 0) {
    console.log('\nPaid orders analysis:');
    paidOrders.forEach((order, index) => {
      console.log(`\nOrder ${index + 1}:`);
      console.log(`  ID: ${order.id}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Payment Status: ${order.paymentStatus}`);
      console.log(`  Total: KSh ${order.totalAmount}`);
      console.log(`  Created: ${order.createdAt}`);
      
      if (order.orderItems && order.orderItems.length > 0) {
        console.log(`  Order Items: ${order.orderItems.length}`);
        order.orderItems.forEach((item, i) => {
          console.log(`    Item ${i + 1}: ${item.product?.name || 'Unknown'} - KSh ${item.totalPrice}`);
          if (item.product?.retailer) {
            console.log(`      Retailer: ${item.product.retailer.email} (${item.product.retailer.role})`);
          }
        });
      }
      
      if (order.serviceAppointments && order.serviceAppointments.length > 0) {
        console.log(`  Service Appointments: ${order.serviceAppointments.length}`);
        order.serviceAppointments.forEach((appointment, i) => {
          console.log(`    Appointment ${i + 1}: ${appointment.service?.name || 'Unknown'} - KSh ${appointment.totalPrice}`);
          if (appointment.service?.vendor) {
            console.log(`      Vendor: ${appointment.service.vendor.email} (${appointment.service.vendor.role})`);
          }
        });
      }
    });
  }
}

async function main() {
  try {
    await testPaymentCallback();
    await testCommissionServiceDirectly();
    await analyzeOrderData();
    
    console.log('\n🎯 Payment Callback Test Summary');
    console.log('=================================');
    console.log('This test helps identify:');
    console.log('1. If payment callback endpoint is working');
    console.log('2. If commission settings are accessible');
    console.log('3. If orders have the required data for commission processing');
    console.log('4. If the payment flow is set up correctly');
    console.log('\nNext steps:');
    console.log('1. Check server logs for commission processing messages');
    console.log('2. Test with a real Paystack payment reference');
    console.log('3. Verify commission transactions are being created');
    console.log('4. Check if there are any errors in the payment callback processing');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
