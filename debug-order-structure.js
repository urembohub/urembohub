const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.urembohub.com/api';

console.log('🔍 Order Structure Debug');
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

async function debugOrderStructure() {
  console.log('1. Getting Order Details');
  console.log('========================');
  
  const ordersResult = await makeRequest('/orders');
  
  if (!ordersResult.success) {
    console.log('❌ Failed to retrieve orders');
    console.log('Error:', ordersResult.error);
    return;
  }
  
  const orders = ordersResult.data.data || ordersResult.data;
  const paidOrders = orders.filter(order => order.paymentStatus === 'paid');
  
  if (paidOrders.length === 0) {
    console.log('❌ No paid orders found');
    return;
  }
  
  const testOrder = paidOrders[0];
  console.log(`Analyzing order: ${testOrder.id}`);
  console.log('Full order structure:');
  console.log(JSON.stringify(testOrder, null, 2));
  
  console.log('\n2. Analyzing Order Items');
  console.log('=========================');
  
  if (testOrder.orderItems && testOrder.orderItems.length > 0) {
    testOrder.orderItems.forEach((item, index) => {
      console.log(`\nOrder Item ${index + 1}:`);
      console.log(`  ID: ${item.id}`);
      console.log(`  Product ID: ${item.productId}`);
      console.log(`  Product Name: ${item.product?.name || 'Unknown'}`);
      console.log(`  Price: KSh ${item.totalPrice}`);
      console.log(`  Quantity: ${item.quantity}`);
      
      console.log('\n  Product Details:');
      if (item.product) {
        console.log(`    ID: ${item.product.id}`);
        console.log(`    Name: ${item.product.name}`);
        console.log(`    Description: ${item.product.description || 'N/A'}`);
        console.log(`    Price: KSh ${item.product.price}`);
        console.log(`    Retailer ID: ${item.product.retailerId || 'N/A'}`);
        
        console.log('\n    Retailer Details:');
        if (item.product.retailer) {
          console.log(`      ID: ${item.product.retailer.id}`);
          console.log(`      Email: ${item.product.retailer.email}`);
          console.log(`      Role: ${item.product.retailer.role}`);
          console.log(`      Name: ${item.product.retailer.firstName} ${item.product.retailer.lastName}`);
          console.log(`      Paystack Subaccount: ${item.product.retailer.paystackSubaccountId || 'N/A'}`);
        } else {
          console.log('      ❌ No retailer information found');
          console.log('      This is the root cause of the commission issue!');
        }
      } else {
        console.log('    ❌ No product information found');
      }
    });
  } else {
    console.log('❌ No order items found');
  }
  
  console.log('\n3. Checking Service Appointments');
  console.log('=================================');
  
  if (testOrder.serviceAppointments && testOrder.serviceAppointments.length > 0) {
    testOrder.serviceAppointments.forEach((appointment, index) => {
      console.log(`\nService Appointment ${index + 1}:`);
      console.log(`  ID: ${appointment.id}`);
      console.log(`  Service ID: ${appointment.serviceId}`);
      console.log(`  Service Name: ${appointment.service?.name || 'Unknown'}`);
      console.log(`  Price: KSh ${appointment.totalPrice}`);
      
      console.log('\n  Service Details:');
      if (appointment.service) {
        console.log(`    ID: ${appointment.service.id}`);
        console.log(`    Name: ${appointment.service.name}`);
        console.log(`    Description: ${appointment.service.description || 'N/A'}`);
        console.log(`    Price: KSh ${appointment.service.price}`);
        console.log(`    Vendor ID: ${appointment.service.vendorId || 'N/A'}`);
        
        console.log('\n    Vendor Details:');
        if (appointment.service.vendor) {
          console.log(`      ID: ${appointment.service.vendor.id}`);
          console.log(`      Email: ${appointment.service.vendor.email}`);
          console.log(`      Role: ${appointment.service.vendor.role}`);
          console.log(`      Name: ${appointment.service.vendor.firstName} ${appointment.service.vendor.lastName}`);
          console.log(`      Paystack Subaccount: ${appointment.service.vendor.paystackSubaccountId || 'N/A'}`);
        } else {
          console.log('      ❌ No vendor information found');
        }
      } else {
        console.log('    ❌ No service information found');
      }
    });
  } else {
    console.log('No service appointments found');
  }
}

async function checkProductRetailerRelation() {
  console.log('\n4. Checking Product-Retailer Relation');
  console.log('======================================');
  
  // This would require a direct database query or a specific endpoint
  console.log('To check product-retailer relations, we need to:');
  console.log('1. Check if products have retailerId field populated');
  console.log('2. Check if the retailer relation is properly loaded in queries');
  console.log('3. Verify the Prisma schema includes the retailer relation');
  console.log('4. Check if the order query includes the product.retailer relation');
}

async function main() {
  try {
    await debugOrderStructure();
    await checkProductRetailerRelation();
    
    console.log('\n🎯 Root Cause Analysis');
    console.log('======================');
    console.log('Based on the analysis above:');
    console.log('1. If retailer information is missing from order items,');
    console.log('   commission processing will fail because it cannot identify');
    console.log('   who should receive the commission.');
    console.log('2. The commission processing code expects:');
    console.log('   - orderItem.product.retailer to exist');
    console.log('   - retailer.role to be defined');
    console.log('   - retailer.id to be available');
    console.log('3. If any of these are missing, commission transactions');
    console.log('   will not be created.');
    console.log('\nNext steps:');
    console.log('1. Check the order query to ensure it includes product.retailer');
    console.log('2. Verify products have retailerId populated');
    console.log('3. Check if the Prisma relation is properly defined');
    console.log('4. Test with a new order that has proper retailer data');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

main();
