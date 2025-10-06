const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.urembohub.com/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

console.log('🚀 Real Payment Flow Test');
console.log('==========================\n');

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

async function findTestOrder() {
  console.log('1. Finding Test Order');
  console.log('=====================');
  
  const result = await makeRequest('/orders');
  
  if (result.success) {
    const orders = result.data.data || result.data;
    console.log(`Found ${orders.length} orders`);
    
    // Find the most recent paid order
    const paidOrders = orders.filter(order => order.paymentStatus === 'paid');
    console.log(`Found ${paidOrders.length} paid orders`);
    
    if (paidOrders.length > 0) {
      const recentOrder = paidOrders[0];
      console.log('Most recent paid order:');
      console.log(`  ID: ${recentOrder.id}`);
      console.log(`  Status: ${recentOrder.status}`);
      console.log(`  Payment Status: ${recentOrder.paymentStatus}`);
      console.log(`  Total: KSh ${recentOrder.totalAmount}`);
      console.log(`  Created: ${recentOrder.createdAt}`);
      
      return recentOrder;
    } else {
      console.log('No paid orders found');
      return null;
    }
  } else {
    console.log('❌ Failed to retrieve orders');
    console.log('Error:', result.error);
    return null;
  }
}

async function checkCommissionTransactions(orderId) {
  console.log('\n2. Checking Commission Transactions');
  console.log('====================================');
  
  const result = await makeRequest('/commission/transactions');
  
  if (result.success) {
    const transactions = result.data.transactions || result.data;
    console.log(`Found ${transactions.length} commission transactions`);
    
    // Find transactions for this order
    const orderTransactions = transactions.filter(t => t.transactionId === orderId);
    console.log(`Found ${orderTransactions.length} commission transactions for order ${orderId}`);
    
    if (orderTransactions.length > 0) {
      console.log('Commission transactions for this order:');
      orderTransactions.forEach((transaction, index) => {
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
      
      return orderTransactions;
    } else {
      console.log('❌ No commission transactions found for this order');
      console.log('This indicates commission processing is not working');
      return [];
    }
  } else {
    console.log('❌ Failed to retrieve commission transactions');
    console.log('Error:', result.error);
    return [];
  }
}

async function testCommissionCalculation(order) {
  console.log('\n3. Testing Commission Calculation');
  console.log('==================================');
  
  if (!order || !order.orderItems || order.orderItems.length === 0) {
    console.log('No order items found to test commission calculation');
    return;
  }
  
  const orderItem = order.orderItems[0];
  const retailer = orderItem.product?.retailer;
  
  if (!retailer) {
    console.log('No retailer found for this order item');
    return;
  }
  
  console.log('Order item details:');
  console.log(`  Product: ${orderItem.product.name}`);
  console.log(`  Retailer: ${retailer.email}`);
  console.log(`  Retailer Role: ${retailer.role}`);
  console.log(`  Amount: KSh ${orderItem.totalPrice}`);
  
  // Test commission calculation
  const calcResult = await makeRequest('/commission/calculate', 'POST', {
    transactionAmount: Number(orderItem.totalPrice),
    role: retailer.role,
    businessUserId: retailer.id
  });
  
  if (calcResult.success) {
    const calc = calcResult.data;
    console.log('\nCommission calculation result:');
    console.log(`  Commission Rate: ${calc.commissionRate}%`);
    console.log(`  Commission Amount: KSh ${calc.commissionAmount}`);
    console.log(`  Platform Fee: KSh ${calc.platformFee}`);
    console.log(`  Net Amount: KSh ${calc.netAmount}`);
    
    // Verify calculation
    const expectedCommission = (Number(orderItem.totalPrice) * calc.commissionRate) / 100;
    const expectedPlatformFee = Number(orderItem.totalPrice) * 0.02; // 2%
    const expectedNet = Number(orderItem.totalPrice) - expectedCommission - expectedPlatformFee;
    
    console.log('\nVerification:');
    console.log(`  Expected Commission: KSh ${expectedCommission}`);
    console.log(`  Expected Platform Fee: KSh ${expectedPlatformFee}`);
    console.log(`  Expected Net: KSh ${expectedNet}`);
    console.log(`  Commission Match: ${Math.abs(calc.commissionAmount - expectedCommission) < 0.01 ? '✅' : '❌'}`);
    console.log(`  Platform Fee Match: ${Math.abs(calc.platformFee - expectedPlatformFee) < 0.01 ? '✅' : '❌'}`);
    console.log(`  Net Amount Match: ${Math.abs(calc.netAmount - expectedNet) < 0.01 ? '✅' : '❌'}`);
    
  } else {
    console.log('❌ Failed to calculate commission');
    console.log('Error:', calcResult.error);
  }
}

async function checkPaymentDetails(order) {
  console.log('\n4. Checking Payment Details');
  console.log('============================');
  
  if (!order) {
    console.log('No order provided');
    return;
  }
  
  console.log('Payment details:');
  console.log(`  Order ID: ${order.id}`);
  console.log(`  Payment Status: ${order.paymentStatus}`);
  console.log(`  Total Amount: KSh ${order.totalAmount}`);
  console.log(`  Currency: ${order.currency || 'KES'}`);
  console.log(`  Created: ${order.createdAt}`);
  
  // Check if there are payment records
  if (order.payments && order.payments.length > 0) {
    console.log(`  Payment Records: ${order.payments.length}`);
    order.payments.forEach((payment, index) => {
      console.log(`    Payment ${index + 1}:`);
      console.log(`      Status: ${payment.status}`);
      console.log(`      Amount: KSh ${payment.amount}`);
      console.log(`      Reference: ${payment.reference}`);
      console.log(`      Created: ${payment.createdAt}`);
    });
  } else {
    console.log('  No payment records found');
  }
}

async function testCommissionSettings() {
  console.log('\n5. Testing Commission Settings');
  console.log('===============================');
  
  const result = await makeRequest('/commission/settings');
  
  if (result.success) {
    const settings = result.data;
    console.log('Commission settings:');
    settings.forEach(setting => {
      console.log(`  ${setting.role}: ${setting.commissionRate}% (${setting.isActive ? 'Active' : 'Inactive'})`);
    });
  } else {
    console.log('❌ Failed to retrieve commission settings');
    console.log('Error:', result.error);
  }
}

async function main() {
  try {
    console.log('Starting real payment flow test...\n');
    
    // Find a test order
    const order = await findTestOrder();
    
    if (!order) {
      console.log('No test order found. Please create a paid order first.');
      return;
    }
    
    // Check commission transactions
    const transactions = await checkCommissionTransactions(order.id);
    
    // Test commission calculation
    await testCommissionCalculation(order);
    
    // Check payment details
    await checkPaymentDetails(order);
    
    // Test commission settings
    await testCommissionSettings();
    
    console.log('\n🎯 Real Payment Flow Test Summary');
    console.log('==================================');
    
    if (transactions.length > 0) {
      console.log('✅ Commission system is working');
      console.log(`  Found ${transactions.length} commission transactions for order ${order.id}`);
      console.log('  Commission calculations appear to be working');
    } else {
      console.log('❌ Commission system is NOT working');
      console.log('  No commission transactions found for paid order');
      console.log('  This indicates a problem with commission processing');
      console.log('\nPossible issues:');
      console.log('1. Commission processing is not being called during payment');
      console.log('2. Commission settings are not configured correctly');
      console.log('3. Database connection issues');
      console.log('4. Paystack integration problems');
      console.log('5. Commission service not properly injected');
    }
    
    console.log('\nNext steps:');
    console.log('- Check server logs for detailed error messages');
    console.log('- Verify commission settings are configured');
    console.log('- Test with a new payment transaction');
    console.log('- Check Paystack integration');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
