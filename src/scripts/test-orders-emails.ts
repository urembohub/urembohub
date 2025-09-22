/**
 * Orders Email Testing Script
 * 
 * Tests all order-related email templates
 * 
 * Run with: npm run test:emails:orders
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EmailService } from '../email/email.service';

const TEST_EMAIL = 'benardogutu65@gmail.com';
const TEST_USER_NAME = 'Pablo Casso';

async function testOrderEmails() {
  console.log('📦 Testing Order Emails...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(EmailService);

  try {
    // Test new order email (to vendor)
    console.log('  📧 Sending new order email...');
    await emailService.sendNewOrderEmail(TEST_EMAIL, TEST_USER_NAME, 'ORD-2024-001', {
      orderId: 'ORD-2024-001',
      totalAmount: 299.99,
      currency: 'USD',
      items: [
        { name: 'Beauty Product 1', quantity: 2, price: 149.99 },
        { name: 'Beauty Product 2', quantity: 1, price: 99.99 }
      ]
    });
    console.log('  ✅ New order email sent successfully!');

    // Test order accepted email (to customer)
    console.log('  📧 Sending order accepted email...');
    await emailService.sendOrderAcceptedEmail(TEST_EMAIL, TEST_USER_NAME, 'ORD-2024-001', {
      orderId: 'ORD-2024-001',
      totalAmount: 299.99,
      currency: 'USD',
      status: 'accepted'
    });
    console.log('  ✅ Order accepted email sent successfully!');

    // Test order shipped email
    console.log('  📧 Sending order shipped email...');
    await emailService.sendOrderShippedEmail(TEST_EMAIL, TEST_USER_NAME, 'ORD-2024-001', 'TRK123456789');
    console.log('  ✅ Order shipped email sent successfully!');

    // Test order delivered email
    console.log('  📧 Sending order delivered email...');
    await emailService.sendOrderDeliveredEmail(TEST_EMAIL, TEST_USER_NAME, 'ORD-2024-001');
    console.log('  ✅ Order delivered email sent successfully!');

    console.log('\n🎉 All order emails sent successfully!');
    console.log(`📬 Check your email at ${TEST_EMAIL}`);

  } catch (error) {
    console.error('❌ Order email test failed:', error);
  } finally {
    await app.close();
  }
}

// Run the test
testOrderEmails().catch(console.error);
