/**
 * Payments Email Testing Script
 * 
 * Tests all payment-related email templates
 * 
 * Run with: npm run test:emails:payments
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EmailService } from '../email/email.service';

const TEST_EMAIL = 'benardogutu65@gmail.com';
const TEST_USER_NAME = 'Pablo Casso';

async function testPaymentEmails() {
  console.log('💳 Testing Payment Emails...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(EmailService);

  try {
    // Test payment successful email
    console.log('  📧 Sending payment successful email...');
    await emailService.sendPaymentSuccessfulEmail(TEST_EMAIL, TEST_USER_NAME, {
      paymentId: 'PAY-2024-001',
      amount: 299.99,
      currency: 'USD',
      method: 'Credit Card',
      orderId: 'ORD-2024-001',
      transactionId: 'TXN123456789'
    });
    console.log('  ✅ Payment successful email sent successfully!');

    // Test payment failed email
    console.log('  📧 Sending payment failed email...');
    await emailService.sendPaymentFailedEmail(TEST_EMAIL, TEST_USER_NAME, {
      paymentId: 'PAY-2024-001',
      amount: 299.99,
      currency: 'USD',
      method: 'Credit Card',
      orderId: 'ORD-2024-001',
      reason: 'Insufficient funds',
      transactionId: 'TXN123456789'
    });
    console.log('  ✅ Payment failed email sent successfully!');

    console.log('\n🎉 All payment emails sent successfully!');
    console.log(`📬 Check your email at ${TEST_EMAIL}`);

  } catch (error) {
    console.error('❌ Payment email test failed:', error);
  } finally {
    await app.close();
  }
}

// Run the test
testPaymentEmails().catch(console.error);
