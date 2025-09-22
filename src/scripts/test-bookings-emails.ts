/**
 * Bookings Email Testing Script
 * 
 * Tests all booking/appointment-related email templates
 * 
 * Run with: npm run test:emails:bookings
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EmailService } from '../email/email.service';

const TEST_EMAIL = 'benardogutu65@gmail.com';
const TEST_USER_NAME = 'Pablo Casso';

async function testBookingEmails() {
  console.log('📅 Testing Booking Emails...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(EmailService);

  try {
    // Test booking confirmed client email
    console.log('  📧 Sending booking confirmed client email...');
    await emailService.sendBookingConfirmedClientEmail(TEST_EMAIL, TEST_USER_NAME, {
      bookingId: 'APT-2024-001',
      serviceName: 'Hair Styling Service',
      appointmentDate: new Date('2024-02-15'),
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      price: 150.00,
      currency: 'USD',
      vendorName: 'Beauty Salon Pro'
    });
    console.log('  ✅ Booking confirmed client email sent successfully!');

    // Test booking confirmed vendor email
    console.log('  📧 Sending booking confirmed vendor email...');
    await emailService.sendBookingConfirmedVendorEmail(TEST_EMAIL, TEST_USER_NAME, {
      bookingId: 'APT-2024-001',
      serviceName: 'Hair Styling Service',
      appointmentDate: new Date('2024-02-15'),
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      price: 150.00,
      currency: 'USD',
      clientName: 'Jane Smith'
    });
    console.log('  ✅ Booking confirmed vendor email sent successfully!');

    // Test booking reminder email
    console.log('  📧 Sending booking reminder email...');
    await emailService.sendBookingReminderEmail(TEST_EMAIL, TEST_USER_NAME, {
      bookingId: 'APT-2024-001',
      serviceName: 'Hair Styling Service',
      appointmentDate: new Date('2024-02-15'),
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      price: 150.00,
      currency: 'USD',
      vendorName: 'Beauty Salon Pro'
    });
    console.log('  ✅ Booking reminder email sent successfully!');

    console.log('\n🎉 All booking emails sent successfully!');
    console.log(`📬 Check your email at ${TEST_EMAIL}`);

  } catch (error) {
    console.error('❌ Booking email test failed:', error);
  } finally {
    await app.close();
  }
}

// Run the test
testBookingEmails().catch(console.error);
