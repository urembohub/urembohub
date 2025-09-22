/**
 * Test Onboarding Email Templates
 * 
 * This script tests the new onboarding email templates:
 * - Admin notification for onboarding submissions
 * - User notification for revision requests
 * 
 * Run with: npm run test:emails:onboarding
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EmailService } from '../email/email.service';

const TEST_EMAIL = 'benardogutu65@gmail.com';
const TEST_USER_NAME = 'Test User';

async function testOnboardingEmails() {
  console.log('🚀 Testing Onboarding Email Templates...');
  console.log('=' .repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(EmailService);

  try {
    // Test 1: Admin Onboarding Submission Notification
    console.log('📧 Testing Admin Onboarding Submission Notification...');
    const submissionData = {
      businessName: 'Beauty Studio Pro',
      fullName: 'Jane Smith',
      email: 'jane@beautystudio.com',
      role: 'vendor',
      submittedAt: new Date().toLocaleDateString()
    };

    const adminResult = await emailService.sendAdminOnboardingSubmissionEmail(
      TEST_EMAIL, 
      submissionData
    );

    if (adminResult.success) {
      console.log('✅ Admin submission notification sent successfully!');
      console.log('📧 Message ID:', adminResult.messageId);
    } else {
      console.error('❌ Admin submission notification failed:', adminResult.error);
    }

    console.log('');

    // Test 2: User Revision Request Notification
    console.log('📧 Testing User Revision Request Notification...');
    const adminNotes = 'Please provide additional documentation for your business license. The current document is not clear enough for verification. Also, we need a recent bank statement to verify your business account.';
    const resubmissionUrl = 'https://urembohub.com/onboarding?step=documents';

    const revisionResult = await emailService.sendOnboardingRevisionRequestEmail(
      TEST_EMAIL,
      TEST_USER_NAME,
      adminNotes,
      resubmissionUrl
    );

    if (revisionResult.success) {
      console.log('✅ Revision request notification sent successfully!');
      console.log('📧 Message ID:', revisionResult.messageId);
    } else {
      console.error('❌ Revision request notification failed:', revisionResult.error);
    }

    console.log('');
    console.log('🎉 Onboarding email tests completed!');
    console.log(`📬 Check your email at ${TEST_EMAIL}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await app.close();
  }
}

testOnboardingEmails();