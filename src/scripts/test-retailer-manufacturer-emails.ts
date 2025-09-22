/**
 * Test Retailer and Manufacturer Email Templates
 * 
 * This script tests the new retailer and manufacturer email templates:
 * - Retailer new order notification
 * - Retailer payment notification
 * - Manufacturer new order notification
 * - Manufacturer payment notification
 * 
 * Run with: npm run test:emails:retailer-manufacturer
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EmailService } from '../email/email.service';

const TEST_EMAIL = 'benardogutu65@gmail.com';
const TEST_RETAILER_NAME = 'Test Retailer';
const TEST_MANUFACTURER_NAME = 'Test Manufacturer';

async function testRetailerManufacturerEmails() {
  console.log('🚀 Testing Retailer and Manufacturer Email Templates...');
  console.log('=' .repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(EmailService);

  try {
    // Test 1: Retailer New Order Notification
    console.log('🛍️ Testing Retailer New Order Notification...');
    const retailerOrderData = {
      order_number: 'RTL-2024-001',
      customer_name: 'Jane Smith',
      total_amount: '299.99',
      order_date: new Date().toLocaleDateString()
    };

    const retailerOrderResult = await emailService.sendRetailerNewOrderEmail(
      TEST_EMAIL,
      TEST_RETAILER_NAME,
      'order-123',
      retailerOrderData
    );

    if (retailerOrderResult.success) {
      console.log('✅ Retailer order notification sent successfully!');
      console.log('📧 Message ID:', retailerOrderResult.messageId);
    } else {
      console.error('❌ Retailer order notification failed:', retailerOrderResult.error);
    }

    console.log('');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second to avoid rate limiting

    // Test 2: Retailer Payment Notification (Success)
    console.log('💰 Testing Retailer Payment Notification (Success)...');
    const retailerPaymentSuccessData = {
      payment_id: 'pay_123456',
      order_id: 'order-123',
      amount: '299.99',
      status: 'successful',
      date: new Date().toLocaleDateString()
    };

    const retailerPaymentSuccessResult = await emailService.sendRetailerPaymentEmail(
      TEST_EMAIL,
      TEST_RETAILER_NAME,
      retailerPaymentSuccessData
    );

    if (retailerPaymentSuccessResult.success) {
      console.log('✅ Retailer payment success notification sent successfully!');
      console.log('📧 Message ID:', retailerPaymentSuccessResult.messageId);
    } else {
      console.error('❌ Retailer payment success notification failed:', retailerPaymentSuccessResult.error);
    }

    console.log('');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second to avoid rate limiting

    // Test 3: Retailer Payment Notification (Failed)
    console.log('❌ Testing Retailer Payment Notification (Failed)...');
    const retailerPaymentFailedData = {
      payment_id: 'pay_789012',
      order_id: 'order-456',
      amount: '199.99',
      status: 'failed',
      date: new Date().toLocaleDateString(),
      error_message: 'Insufficient funds in customer account'
    };

    const retailerPaymentFailedResult = await emailService.sendRetailerPaymentEmail(
      TEST_EMAIL,
      TEST_RETAILER_NAME,
      retailerPaymentFailedData
    );

    if (retailerPaymentFailedResult.success) {
      console.log('✅ Retailer payment failed notification sent successfully!');
      console.log('📧 Message ID:', retailerPaymentFailedResult.messageId);
    } else {
      console.error('❌ Retailer payment failed notification failed:', retailerPaymentFailedResult.error);
    }

    console.log('');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second to avoid rate limiting

    // Test 4: Manufacturer New Order Notification
    console.log('🏭 Testing Manufacturer New Order Notification...');
    const manufacturerOrderData = {
      order_number: 'MFG-2024-001',
      customer_name: 'Beauty Store Pro',
      total_amount: '1500.00',
      order_date: new Date().toLocaleDateString()
    };

    const manufacturerOrderResult = await emailService.sendManufacturerNewOrderEmail(
      TEST_EMAIL,
      TEST_MANUFACTURER_NAME,
      'order-789',
      manufacturerOrderData
    );

    if (manufacturerOrderResult.success) {
      console.log('✅ Manufacturer order notification sent successfully!');
      console.log('📧 Message ID:', manufacturerOrderResult.messageId);
    } else {
      console.error('❌ Manufacturer order notification failed:', manufacturerOrderResult.error);
    }

    console.log('');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second to avoid rate limiting

    // Test 5: Manufacturer Payment Notification (Success)
    console.log('💰 Testing Manufacturer Payment Notification (Success)...');
    const manufacturerPaymentSuccessData = {
      payment_id: 'pay_345678',
      order_id: 'order-789',
      amount: '1500.00',
      status: 'completed',
      date: new Date().toLocaleDateString()
    };

    const manufacturerPaymentSuccessResult = await emailService.sendManufacturerPaymentEmail(
      TEST_EMAIL,
      TEST_MANUFACTURER_NAME,
      manufacturerPaymentSuccessData
    );

    if (manufacturerPaymentSuccessResult.success) {
      console.log('✅ Manufacturer payment success notification sent successfully!');
      console.log('📧 Message ID:', manufacturerPaymentSuccessResult.messageId);
    } else {
      console.error('❌ Manufacturer payment success notification failed:', manufacturerPaymentSuccessResult.error);
    }

    console.log('');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second to avoid rate limiting

    // Test 6: Manufacturer Payment Notification (Failed)
    console.log('❌ Testing Manufacturer Payment Notification (Failed)...');
    const manufacturerPaymentFailedData = {
      payment_id: 'pay_901234',
      order_id: 'order-101',
      amount: '800.00',
      status: 'failed',
      date: new Date().toLocaleDateString(),
      error_message: 'Payment gateway timeout'
    };

    const manufacturerPaymentFailedResult = await emailService.sendManufacturerPaymentEmail(
      TEST_EMAIL,
      TEST_MANUFACTURER_NAME,
      manufacturerPaymentFailedData
    );

    if (manufacturerPaymentFailedResult.success) {
      console.log('✅ Manufacturer payment failed notification sent successfully!');
      console.log('📧 Message ID:', manufacturerPaymentFailedResult.messageId);
    } else {
      console.error('❌ Manufacturer payment failed notification failed:', manufacturerPaymentFailedResult.error);
    }

    console.log('');
    console.log('🎉 Retailer and Manufacturer email tests completed!');
    console.log(`📬 Check your email at ${TEST_EMAIL}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await app.close();
  }
}

testRetailerManufacturerEmails();
