/**
 * Authentication Email Testing Script
 * 
 * Tests all authentication-related email templates
 * 
 * Run with: npm run test:emails:auth
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EmailService } from '../email/email.service';

const TEST_EMAIL = 'benardogutu65@gmail.com';
const TEST_USER_NAME = 'Pablo Casso';

async function testAuthenticationEmails() {
  console.log('🔐 Testing Authentication Emails...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(EmailService);

  try {
    // Test account created email
    console.log('  📧 Sending account created email...');
    await emailService.sendAccountCreatedEmail(TEST_EMAIL, TEST_USER_NAME);
    console.log('  ✅ Account created email sent successfully!');

    // Test password reset email
    console.log('  📧 Sending password reset email...');
    await emailService.sendPasswordResetEmail(TEST_EMAIL, TEST_USER_NAME, 'https://urembohub.com/reset-password?token=abc123');
    console.log('  ✅ Password reset email sent successfully!');

    // Test email verification email
    console.log('  📧 Sending email verification email...');
    await emailService.sendVerificationEmail(TEST_EMAIL, TEST_USER_NAME, 'https://urembohub.com/verify-email?token=xyz789');
    console.log('  ✅ Email verification email sent successfully!');

    // Test suspicious login email
    console.log('  📧 Sending suspicious login email...');
    await emailService.sendSuspiciousLoginEmail(TEST_EMAIL, TEST_USER_NAME, '192.168.1.100', 'New York, NY');
    console.log('  ✅ Suspicious login email sent successfully!');

    console.log('\n🎉 All authentication emails sent successfully!');
    console.log(`📬 Check your email at ${TEST_EMAIL}`);

  } catch (error) {
    console.error('❌ Authentication email test failed:', error);
  } finally {
    await app.close();
  }
}

// Run the test
testAuthenticationEmails().catch(console.error);
