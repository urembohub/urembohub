import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EmailQueueService } from '../email/email-queue.service';
import { AdminNotificationService } from '../admin/admin-notification.service';
import { PasswordResetService } from '../auth/password-reset.service';
import { ConfigService } from '@nestjs/config';

async function testCommunicationService() {
  console.log('🧪 Testing Communication Service...');

  // Initialize services
  const prisma = new PrismaService();
  const configService = new ConfigService();
  const emailService = new EmailService(configService);
  const emailQueueService = new EmailQueueService(null as any); // Mock queue for testing
  const adminNotificationService = new AdminNotificationService(prisma, emailService, emailQueueService);
  const passwordResetService = new PasswordResetService(prisma, emailService, configService);

  try {
    // Test 1: Admin Signup Notification
    console.log('\n📧 Test 1: Admin Signup Notification');
    await adminNotificationService.notifyAdminsOfSignup({
      email: 'testuser@example.com',
      fullName: 'Test User',
      role: 'client',
      businessName: 'Test Business',
      createdAt: new Date(),
    });

    // Test 2: Partner Signup Notification
    console.log('\n🤝 Test 2: Partner Signup Notification');
    await adminNotificationService.notifyPartnerSignup({
      email: 'testvendor@example.com',
      fullName: 'Test Vendor',
      role: 'vendor',
      businessName: 'Test Vendor Business',
      createdAt: new Date(),
    });

    // Test 3: Ticket Notification
    console.log('\n🎫 Test 3: Ticket Notification');
    await adminNotificationService.notifyAdminsOfTicket({
      id: 'test-ticket-123',
      subject: 'Test Support Ticket',
      priority: 'high',
      category: 'Technical Support',
      userName: 'Test User',
      userEmail: 'testuser@example.com',
      description: 'This is a test ticket description',
      createdAt: new Date(),
    });

    // Test 4: Sale Notification
    console.log('\n💰 Test 4: Sale Notification');
    await adminNotificationService.notifyAdminsOfSale({
      transactionId: 'test-txn-123',
      amount: '$150.00',
      currency: 'USD',
      customerName: 'Test Customer',
      vendorName: 'Test Vendor',
      commission: '$15.00',
      createdAt: new Date(),
    });

    // Test 5: Cart Addition Notification
    console.log('\n🛒 Test 5: Cart Addition Notification');
    await adminNotificationService.notifyAdminsOfCartAddition({
      customerName: 'Test Customer',
      customerEmail: 'testcustomer@example.com',
      totalAmount: '$75.00',
      itemsCount: 3,
      vendorName: 'Test Vendor',
      createdAt: new Date(),
    });

    // Test 6: Password Reset OTP
    console.log('\n🔐 Test 6: Password Reset OTP');
    await emailService.sendPasswordResetOTPEmail(
      'testuser@example.com',
      'Test User',
      '123456'
    );

    // Test 7: Partner Approval
    console.log('\n✅ Test 7: Partner Approval');
    await adminNotificationService.notifyPartnerApproval(
      {
        email: 'testvendor@example.com',
        fullName: 'Test Vendor',
      },
      true
    );

    // Test 8: Partner Rejection
    console.log('\n❌ Test 8: Partner Rejection');
    await adminNotificationService.notifyPartnerApproval(
      {
        email: 'testvendor2@example.com',
        fullName: 'Test Vendor 2',
      },
      false,
      'Incomplete business documentation'
    );

    console.log('\n✅ All communication service tests completed successfully!');
    console.log('\n📋 Summary of tested features:');
    console.log('   ✓ Admin signup notifications');
    console.log('   ✓ Partner signup notifications');
    console.log('   ✓ Ticket notifications');
    console.log('   ✓ Sale notifications');
    console.log('   ✓ Cart addition notifications');
    console.log('   ✓ Password reset OTP emails');
    console.log('   ✓ Partner approval emails');
    console.log('   ✓ Partner rejection emails');

  } catch (error) {
    console.error('❌ Error testing communication service:', error);
  }
}

testCommunicationService()
  .then(async () => {
    console.log('\n🎉 Communication service testing completed!');
  })
  .catch(async (e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  });
