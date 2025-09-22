/**
 * Admin Email Testing Script
 * 
 * Tests all admin-related email templates
 * 
 * Run with: npm run test:emails:admin
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EmailService } from '../email/email.service';

const TEST_EMAIL = 'benardogutu65@gmail.com';
const TEST_USER_NAME = 'Pablo Casso';

async function testAdminEmails() {
  console.log('👨‍💼 Testing Admin Emails...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(EmailService);

  try {
    // Test dispute pending email
    console.log('  📧 Sending dispute pending email...');
    await emailService.sendDisputePendingEmail(
      TEST_EMAIL, 
      'DIS-2024-001', 
      {
        disputeId: 'DIS-2024-001',
        orderId: 'ORD-2024-001',
        reason: 'Product quality issue',
        amount: 299.99,
        customerName: 'John Doe',
        vendorName: 'Beauty Salon Pro'
      }
    );
    console.log('  ✅ Dispute pending email sent successfully!');

    // Test high value order email
    console.log('  📧 Sending high value order email...');
    await emailService.sendHighValueOrderEmail(
      TEST_EMAIL, 
      'ORD-2024-002', 
      {
        orderId: 'ORD-2024-002',
        orderNumber: 'ORD-2024-002',
        paymentAmount: 1500.00,
        userName: 'Jane Smith',
        vendorName: 'Luxury Beauty Services',
        orderDate: new Date().toISOString()
      }
    );
    console.log('  ✅ High value order email sent successfully!');

    console.log('\n🎉 All admin emails sent successfully!');
    console.log(`📬 Check your email at ${TEST_EMAIL}`);

  } catch (error) {
    console.error('❌ Admin email test failed:', error);
  } finally {
    await app.close();
  }
}

// Run the test
testAdminEmails().catch(console.error);
