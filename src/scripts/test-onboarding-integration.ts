/**
 * Test Complete Onboarding Integration
 * 
 * This script tests the complete onboarding flow with email notifications:
 * 1. User submits onboarding requirements (triggers admin notification)
 * 2. Admin approves/rejects/requests revision (triggers user notification)
 * 
 * Run with: npm run test:onboarding:integration
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { OnboardingService } from '../onboarding/onboarding.service';
import { PrismaService } from '../prisma/prisma.service';

const TEST_EMAIL = 'benardogutu65@gmail.com';
const TEST_USER_NAME = 'Integration Test User';

async function testOnboardingIntegration() {
  console.log('🚀 Testing Complete Onboarding Integration...');
  console.log('=' .repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const onboardingService = app.get(OnboardingService);
  const prisma = app.get(PrismaService);

  let testUser: any;
  let testAdmin: any;
  let requirement1: any;
  let requirement2: any;

  try {
    // Step 1: Create a test admin user
    console.log('👨‍💼 Step 1: Creating test admin user...');
    testAdmin = await prisma.profile.create({
      data: {
        email: 'admin-test@example.com',
        password: 'hashedpassword',
        fullName: 'Test Admin',
        role: 'admin',
        isVerified: true
      }
    });
    console.log('✅ Test admin created:', testAdmin.id);

    // Step 2: Create a test user
    console.log('👤 Step 2: Creating test user...');
    testUser = await prisma.profile.create({
      data: {
        email: 'integration-test@example.com',
        password: 'hashedpassword',
        fullName: TEST_USER_NAME,
        role: 'vendor',
        businessName: 'Integration Test Business',
        businessDescription: 'A test business for integration testing',
        businessAddress: '123 Test Street, Test City',
        businessPhone: '+1234567890',
        onboardingStatus: 'in_progress'
      }
    });
    console.log('✅ Test user created:', testUser.id);

    // Step 3: Create test onboarding requirements
    console.log('📋 Step 3: Creating test requirements...');
    requirement1 = await prisma.onboardingRequirement.create({
      data: {
        role: 'vendor',
        label: 'Business License',
        fieldType: 'file',
        isMandatory: true,
        description: 'Upload your business license',
        position: 1,
        isActive: true
      }
    });

    requirement2 = await prisma.onboardingRequirement.create({
      data: {
        role: 'vendor',
        label: 'Business Description',
        fieldType: 'textarea',
        isMandatory: true,
        description: 'Describe your business',
        position: 2,
        isActive: true
      }
    });
    console.log('✅ Test requirements created');

    // Step 4: Get all existing mandatory requirements for vendors
    console.log('📋 Step 4: Getting existing mandatory requirements...');
    const existingRequirements = await prisma.onboardingRequirement.findMany({
      where: {
        role: 'vendor',
        isMandatory: true,
        isActive: true
      }
    });
    console.log(`📊 Found ${existingRequirements.length} existing mandatory requirements for vendors`);

    // Step 5: Submit requirements (should trigger admin notification)
    console.log('📤 Step 5: Submitting requirements (should trigger admin notification)...');
    const submissions = existingRequirements.map((req, index) => ({
      requirementId: req.id,
      value: req.fieldType === 'file' ? `test-file-${index}.pdf` : `Test value for ${req.label}`,
      fileUrl: req.fieldType === 'file' ? `https://example.com/test-file-${index}.pdf` : undefined
    }));

    const bulkSubmitDto = { submissions };

    const submissionResult = await onboardingService.bulkSubmitRequirements(testUser.id, bulkSubmitDto);
    console.log('✅ Requirements submitted:', submissionResult);

    // Wait a moment for email processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if user status changed to submitted
    const userAfterSubmission = await prisma.profile.findUnique({
      where: { id: testUser.id }
    });
    console.log('📊 User status after submission:', userAfterSubmission?.onboardingStatus);

    // Step 6: Test admin approval (should trigger user notification)
    console.log('✅ Step 6: Testing admin approval (should trigger user notification)...');
    const approvalResult = await onboardingService.updateUserOnboardingStatus(
      testUser.id,
      'approved',
      testAdmin.id,
      'All requirements look good!'
    );
    console.log('✅ User approved:', approvalResult.user.onboardingStatus);

    // Wait a moment for email processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 7: Test revision request (should trigger user notification)
    console.log('📝 Step 7: Testing revision request (should trigger user notification)...');
    const revisionResult = await onboardingService.updateUserOnboardingStatus(
      testUser.id,
      'revision_requested',
      testAdmin.id,
      'Please provide additional documentation for your business license. The current document is not clear enough for verification.'
    );
    console.log('✅ Revision requested:', revisionResult.user.onboardingStatus);

    // Wait a moment for email processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 8: Test rejection (should trigger user notification)
    console.log('❌ Step 8: Testing rejection (should trigger user notification)...');
    const rejectionResult = await onboardingService.updateUserOnboardingStatus(
      testUser.id,
      'rejected',
      testAdmin.id,
      'Business license does not meet requirements',
      'The provided business license is expired and does not meet our verification standards.'
    );
    console.log('✅ User rejected:', rejectionResult.user.onboardingStatus);

    console.log('');
    console.log('🎉 Complete onboarding integration test completed!');
    console.log('📧 Check your email at benardogutu65@gmail.com for all notifications:');
    console.log('  - Admin notification for submission');
    console.log('  - User notification for approval');
    console.log('  - User notification for revision request');
    console.log('  - User notification for rejection');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
  } finally {
    // Cleanup: Delete test user, admin, and requirements
    try {
      if (testUser) {
        await prisma.onboardingSubmission.deleteMany({
          where: { userId: testUser.id }
        });
        await prisma.onboardingReview.deleteMany({
          where: { userId: testUser.id }
        });
        await prisma.profile.delete({
          where: { id: testUser.id }
        });
      }
      
      if (testAdmin) {
        await prisma.profile.delete({
          where: { id: testAdmin.id }
        });
      }
      
      if (requirement1 && requirement2) {
        await prisma.onboardingRequirement.deleteMany({
          where: { id: { in: [requirement1.id, requirement2.id] } }
        });
      }
      
      console.log('🧹 Test data cleaned up');
    } catch (cleanupError) {
      console.error('⚠️ Cleanup failed:', cleanupError);
    }

    await app.close();
  }
}

testOnboardingIntegration();
