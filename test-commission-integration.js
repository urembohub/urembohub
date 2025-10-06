const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.urembohub.com/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

console.log('🧪 Commission Integration Test');
console.log('==============================\n');

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
    const settings = result.data;
    console.log('✅ Commission settings retrieved');
    
    // Check if all required roles have settings
    const requiredRoles = ['retailer', 'vendor', 'manufacturer'];
    const existingRoles = settings.map(s => s.role);
    
    console.log('Required roles:', requiredRoles);
    console.log('Existing roles:', existingRoles);
    
    const missingRoles = requiredRoles.filter(role => !existingRoles.includes(role));
    
    if (missingRoles.length > 0) {
      console.log('❌ Missing commission settings for roles:', missingRoles);
      
      // Create missing settings
      for (const role of missingRoles) {
        const defaultRates = {
          retailer: 8.0,
          vendor: 10.0,
          manufacturer: 5.0
        };
        
        console.log(`Creating default setting for ${role} with ${defaultRates[role]}% rate...`);
        
        const createResult = await makeRequest('/commission/settings', 'POST', {
          role,
          commissionRate: defaultRates[role],
          isActive: true
        });
        
        if (createResult.success) {
          console.log(`✅ Created ${role} setting`);
        } else {
          console.log(`❌ Failed to create ${role} setting:`, createResult.error);
        }
      }
    } else {
      console.log('✅ All required roles have commission settings');
    }
    
    // Display current settings
    console.log('\nCurrent Commission Settings:');
    settings.forEach(setting => {
      console.log(`  ${setting.role}: ${setting.commissionRate}% (${setting.isActive ? 'Active' : 'Inactive'})`);
    });
    
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
    { transactionAmount: 1000, role: 'retailer' },
    { transactionAmount: 500, role: 'vendor' },
    { transactionAmount: 2000, role: 'manufacturer' }
  ];
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.role} - KSh ${testCase.transactionAmount}`);
    
    const result = await makeRequest('/commission/calculate', 'POST', testCase);
    
    if (result.success) {
      const calc = result.data;
      console.log('✅ Calculation successful');
      console.log(`  Commission Rate: ${calc.commissionRate}%`);
      console.log(`  Commission Amount: KSh ${calc.commissionAmount}`);
      console.log(`  Platform Fee: KSh ${calc.platformFee}`);
      console.log(`  Net Amount: KSh ${calc.netAmount}`);
      
      // Verify calculation
      const expectedCommission = (testCase.transactionAmount * calc.commissionRate) / 100;
      const expectedPlatformFee = testCase.transactionAmount * 0.02; // 2%
      const expectedNet = testCase.transactionAmount - expectedCommission - expectedPlatformFee;
      
      console.log('  Verification:');
      console.log(`    Expected Commission: KSh ${expectedCommission}`);
      console.log(`    Expected Platform Fee: KSh ${expectedPlatformFee}`);
      console.log(`    Expected Net: KSh ${expectedNet}`);
      console.log(`    Calculation Match: ${Math.abs(calc.commissionAmount - expectedCommission) < 0.01 ? '✅' : '❌'}`);
      
    } else {
      console.log('❌ Calculation failed');
      console.log('Error:', result.error);
      console.log('Status:', result.status);
    }
    console.log('');
  }
}

async function testOrderProcessing() {
  console.log('3. Testing Order Processing');
  console.log('============================');
  
  // Get recent orders
  const ordersResult = await makeRequest('/orders');
  
  if (ordersResult.success) {
    const orders = ordersResult.data.data || ordersResult.data;
    console.log(`Found ${orders.length} orders`);
    
    // Find orders with payment status 'paid'
    const paidOrders = orders.filter(order => order.paymentStatus === 'paid');
    console.log(`Found ${paidOrders.length} paid orders`);
    
    if (paidOrders.length > 0) {
      console.log('\nRecent Paid Orders:');
      paidOrders.slice(0, 3).forEach((order, index) => {
        console.log(`Order ${index + 1}:`);
        console.log(`  ID: ${order.id}`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Total: KSh ${order.totalAmount}`);
        console.log(`  Payment Status: ${order.paymentStatus}`);
        console.log(`  Created: ${order.createdAt}`);
        
        // Check if this order has commission transactions
        console.log(`  Has Commission Transactions: ${order.commissionTransactions ? order.commissionTransactions.length : 'Unknown'}`);
        console.log('');
      });
    } else {
      console.log('No paid orders found to test commission processing');
    }
    
  } else {
    console.log('❌ Failed to retrieve orders');
    console.log('Error:', ordersResult.error);
  }
  
  console.log('\n');
}

async function testCommissionTransactions() {
  console.log('4. Testing Commission Transactions');
  console.log('===================================');
  
  const result = await makeRequest('/commission/transactions');
  
  if (result.success) {
    const transactions = result.data.transactions || result.data;
    console.log(`Found ${transactions.length} commission transactions`);
    
    if (transactions.length > 0) {
      console.log('\nRecent Commission Transactions:');
      transactions.slice(0, 5).forEach((transaction, index) => {
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
      
      // Calculate totals
      const totalCommission = transactions.reduce((sum, t) => sum + Number(t.commissionAmount), 0);
      const totalAmount = transactions.reduce((sum, t) => sum + Number(t.transactionAmount), 0);
      
      console.log('Summary:');
      console.log(`  Total Transactions: ${transactions.length}`);
      console.log(`  Total Amount: KSh ${totalAmount}`);
      console.log(`  Total Commission: KSh ${totalCommission}`);
      console.log(`  Average Commission Rate: ${totalAmount > 0 ? ((totalCommission / totalAmount) * 100).toFixed(2) : 0}%`);
      
    } else {
      console.log('No commission transactions found');
      console.log('This could indicate:');
      console.log('- Commission processing is not working');
      console.log('- No paid orders have been processed');
      console.log('- Commission transactions are not being created');
    }
    
  } else {
    console.log('❌ Failed to retrieve commission transactions');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
  
  console.log('\n');
}

async function testPaymentFlow() {
  console.log('5. Testing Payment Flow');
  console.log('========================');
  
  console.log('To test the complete payment flow:');
  console.log('1. Create a test order through the frontend');
  console.log('2. Process payment through Paystack');
  console.log('3. Check if commission transactions are created');
  console.log('4. Verify commission calculations are correct');
  console.log('');
  
  // Check if there are any recent orders that should have commissions
  const ordersResult = await makeRequest('/orders');
  
  if (ordersResult.success) {
    const orders = ordersResult.data.data || ordersResult.data;
    const recentOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return orderDate > oneDayAgo && order.paymentStatus === 'paid';
    });
    
    console.log(`Found ${recentOrders.length} recent paid orders (last 24 hours)`);
    
    if (recentOrders.length > 0) {
      console.log('These orders should have commission transactions:');
      recentOrders.forEach((order, index) => {
        console.log(`  Order ${index + 1}: ${order.id} - KSh ${order.totalAmount}`);
      });
    }
  }
  
  console.log('\n');
}

async function main() {
  try {
    await testCommissionSettings();
    await testCommissionCalculation();
    await testOrderProcessing();
    await testCommissionTransactions();
    await testPaymentFlow();
    
    console.log('🎯 Integration Test Summary');
    console.log('============================');
    console.log('Check the results above to identify issues with:');
    console.log('1. Commission settings configuration');
    console.log('2. Commission calculation accuracy');
    console.log('3. Order processing and payment status');
    console.log('4. Commission transaction creation');
    console.log('5. Payment flow integration');
    console.log('\nNext steps:');
    console.log('- Fix any configuration issues found');
    console.log('- Test with a real payment transaction');
    console.log('- Check server logs for detailed error messages');
    console.log('- Verify Paystack integration is working');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
