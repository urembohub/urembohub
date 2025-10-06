const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.urembohub.com/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

console.log('📋 Commission System Log Checker');
console.log('=================================\n');

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

async function checkCommissionSettings() {
  console.log('1. Checking Commission Settings');
  console.log('===============================');
  
  const result = await makeRequest('/commission/settings');
  
  if (result.success) {
    const settings = result.data;
    console.log('✅ Commission settings retrieved');
    
    if (settings.length === 0) {
      console.log('❌ No commission settings found');
      console.log('This is likely the main issue!');
      console.log('Commission processing requires settings to be configured.');
      return false;
    }
    
    console.log('Commission settings found:');
    settings.forEach(setting => {
      console.log(`  ${setting.role}: ${setting.commissionRate}% (${setting.isActive ? 'Active' : 'Inactive'})`);
    });
    
    // Check if all required roles have settings
    const requiredRoles = ['retailer', 'vendor', 'manufacturer'];
    const existingRoles = settings.map(s => s.role);
    const missingRoles = requiredRoles.filter(role => !existingRoles.includes(role));
    
    if (missingRoles.length > 0) {
      console.log('❌ Missing commission settings for roles:', missingRoles);
      return false;
    }
    
    // Check if any settings are inactive
    const inactiveSettings = settings.filter(s => !s.isActive);
    if (inactiveSettings.length > 0) {
      console.log('⚠️  Inactive commission settings:', inactiveSettings.map(s => s.role));
    }
    
    return true;
  } else {
    console.log('❌ Failed to retrieve commission settings');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
    return false;
  }
}

async function checkRecentOrders() {
  console.log('\n2. Checking Recent Orders');
  console.log('==========================');
  
  const result = await makeRequest('/orders');
  
  if (result.success) {
    const orders = result.data.data || result.data;
    console.log(`Found ${orders.length} total orders`);
    
    // Filter recent orders (last 7 days)
    const recentOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return orderDate > sevenDaysAgo;
    });
    
    console.log(`Found ${recentOrders.length} orders in the last 7 days`);
    
    // Filter paid orders
    const paidOrders = recentOrders.filter(order => order.paymentStatus === 'paid');
    console.log(`Found ${paidOrders.length} paid orders in the last 7 days`);
    
    if (paidOrders.length > 0) {
      console.log('\nRecent paid orders:');
      paidOrders.slice(0, 5).forEach((order, index) => {
        console.log(`  Order ${index + 1}:`);
        console.log(`    ID: ${order.id}`);
        console.log(`    Status: ${order.status}`);
        console.log(`    Payment Status: ${order.paymentStatus}`);
        console.log(`    Total: KSh ${order.totalAmount}`);
        console.log(`    Created: ${order.createdAt}`);
        console.log(`    Has Order Items: ${order.orderItems ? order.orderItems.length : 0}`);
        console.log(`    Has Service Appointments: ${order.serviceAppointments ? order.serviceAppointments.length : 0}`);
        console.log('');
      });
      
      return paidOrders;
    } else {
      console.log('No paid orders found in the last 7 days');
      return [];
    }
  } else {
    console.log('❌ Failed to retrieve orders');
    console.log('Error:', result.error);
    return [];
  }
}

async function checkCommissionTransactions() {
  console.log('\n3. Checking Commission Transactions');
  console.log('====================================');
  
  const result = await makeRequest('/commission/transactions');
  
  if (result.success) {
    const transactions = result.data.transactions || result.data;
    console.log(`Found ${transactions.length} total commission transactions`);
    
    // Filter recent transactions (last 7 days)
    const recentTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.createdAt);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return transactionDate > sevenDaysAgo;
    });
    
    console.log(`Found ${recentTransactions.length} commission transactions in the last 7 days`);
    
    if (recentTransactions.length > 0) {
      console.log('\nRecent commission transactions:');
      recentTransactions.slice(0, 5).forEach((transaction, index) => {
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
      
      return recentTransactions;
    } else {
      console.log('No commission transactions found in the last 7 days');
      return [];
    }
  } else {
    console.log('❌ Failed to retrieve commission transactions');
    console.log('Error:', result.error);
    return [];
  }
}

async function checkCommissionAnalytics() {
  console.log('\n4. Checking Commission Analytics');
  console.log('=================================');
  
  const result = await makeRequest('/commission/analytics/summary');
  
  if (result.success) {
    console.log('✅ Commission analytics retrieved');
    console.log('Analytics data:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Failed to retrieve commission analytics');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
}

async function checkDatabaseConnection() {
  console.log('\n5. Checking Database Connection');
  console.log('================================');
  
  const result = await makeRequest('/analytics/dashboard');
  
  if (result.success) {
    console.log('✅ Database connection successful');
    console.log('Dashboard data retrieved successfully');
  } else {
    console.log('❌ Database connection failed');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
}

async function analyzeCommissionIssue(paidOrders, commissionTransactions) {
  console.log('\n6. Analyzing Commission Issue');
  console.log('==============================');
  
  if (paidOrders.length === 0) {
    console.log('No paid orders found to analyze');
    return;
  }
  
  if (commissionTransactions.length === 0) {
    console.log('❌ CRITICAL ISSUE: No commission transactions found despite having paid orders');
    console.log('This indicates commission processing is not working at all.');
    console.log('\nPossible causes:');
    console.log('1. Commission processing is not being called during payment callback');
    console.log('2. Commission service is not properly injected');
    console.log('3. Database connection issues during commission processing');
    console.log('4. Commission settings are not configured');
    console.log('5. Paystack integration is not working correctly');
    return;
  }
  
  // Check if recent paid orders have corresponding commission transactions
  const recentOrderIds = paidOrders.map(order => order.id);
  const recentTransactionOrderIds = commissionTransactions.map(t => t.transactionId);
  
  const ordersWithoutCommissions = recentOrderIds.filter(orderId => 
    !recentTransactionOrderIds.includes(orderId)
  );
  
  if (ordersWithoutCommissions.length > 0) {
    console.log('⚠️  Some recent paid orders do not have commission transactions:');
    ordersWithoutCommissions.forEach(orderId => {
      console.log(`  Order ${orderId} - No commission transactions found`);
    });
  } else {
    console.log('✅ All recent paid orders have corresponding commission transactions');
  }
  
  // Calculate commission totals
  const totalCommission = commissionTransactions.reduce((sum, t) => sum + Number(t.commissionAmount), 0);
  const totalAmount = commissionTransactions.reduce((sum, t) => sum + Number(t.transactionAmount), 0);
  
  console.log('\nCommission Summary:');
  console.log(`  Total Transactions: ${commissionTransactions.length}`);
  console.log(`  Total Amount: KSh ${totalAmount}`);
  console.log(`  Total Commission: KSh ${totalCommission}`);
  console.log(`  Average Commission Rate: ${totalAmount > 0 ? ((totalCommission / totalAmount) * 100).toFixed(2) : 0}%`);
}

async function main() {
  try {
    console.log('Starting commission system log check...\n');
    
    // Check commission settings
    const settingsOk = await checkCommissionSettings();
    
    // Check recent orders
    const paidOrders = await checkRecentOrders();
    
    // Check commission transactions
    const commissionTransactions = await checkCommissionTransactions();
    
    // Check commission analytics
    await checkCommissionAnalytics();
    
    // Check database connection
    await checkDatabaseConnection();
    
    // Analyze the issue
    await analyzeCommissionIssue(paidOrders, commissionTransactions);
    
    console.log('\n🎯 Commission System Diagnosis');
    console.log('==============================');
    
    if (!settingsOk) {
      console.log('❌ CRITICAL: Commission settings are not configured');
      console.log('Fix: Configure commission settings for all roles (retailer, vendor, manufacturer)');
    }
    
    if (paidOrders.length === 0) {
      console.log('⚠️  No recent paid orders found');
      console.log('Fix: Test with a real payment transaction');
    }
    
    if (commissionTransactions.length === 0 && paidOrders.length > 0) {
      console.log('❌ CRITICAL: Commission processing is not working');
      console.log('Fix: Check payment callback processing and commission service integration');
    }
    
    if (commissionTransactions.length > 0) {
      console.log('✅ Commission system appears to be working');
      console.log(`Found ${commissionTransactions.length} commission transactions`);
    }
    
    console.log('\nNext steps:');
    console.log('1. Fix any configuration issues identified above');
    console.log('2. Check server logs for detailed error messages');
    console.log('3. Test with a new payment transaction');
    console.log('4. Verify Paystack integration is working');
    console.log('5. Check commission service injection in payment modules');
    
  } catch (error) {
    console.error('❌ Log check failed:', error.message);
  }
}

main();
