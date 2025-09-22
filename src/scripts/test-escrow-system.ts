import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EscrowService } from '../escrow/escrow.service';
import { EmailService } from '../email/email.service';
import { PaystackService } from '../paystack/paystack.service';

async function testEscrowSystem() {
  console.log('🧪 Starting Escrow System Test...\n');

  // Initialize services
  const configService = new ConfigService();
  const prisma = new PrismaService(configService);
  const emailService = new EmailService(configService);
  const paystackService = new PaystackService(configService, prisma);
  const escrowService = new EscrowService(prisma, emailService, configService, paystackService);

  try {
    // Clean up any existing test data
    console.log('🧹 Cleaning up existing test data...');
    await prisma.escrowAction.deleteMany({
      where: {
        escrow: {
          order: {
            customerEmail: 'test-customer@example.com'
          }
        }
      }
    });
    await prisma.serviceEscrow.deleteMany({
      where: {
        order: {
          customerEmail: 'test-customer@example.com'
        }
      }
    });
    await prisma.order.deleteMany({
      where: {
        customerEmail: 'test-customer@example.com'
      }
    });
    await prisma.serviceAppointment.deleteMany({
      where: {
        service: {
          name: 'Test Service for Escrow'
        }
      }
    });
    await prisma.service.deleteMany({
      where: {
        name: 'Test Service for Escrow'
      }
    });
    await prisma.serviceCategory.deleteMany({
      where: {
        slug: 'test-category-escrow'
      }
    });
    await prisma.profile.deleteMany({
      where: {
        email: 'test-vendor@example.com'
      }
    });
    await prisma.profile.deleteMany({
      where: {
        email: 'test-customer@example.com'
      }
    });

    // Create test vendor
    console.log('👤 Creating test vendor...');
    const testVendor = await prisma.profile.create({
      data: {
        email: 'test-vendor@example.com',
        fullName: 'Test Vendor',
        phone: '+254700000000',
        role: 'vendor',
        businessName: 'Test Vendor Business',
        businessAddress: 'Test Vendor Address',
        password: 'hashedpassword123',
        paystackSubaccountId: 'ACCT_test_vendor_123',
      }
    });
    console.log('✅ Test vendor created:', testVendor.id);

    // Create test customer
    console.log('👤 Creating test customer...');
    const testCustomer = await prisma.profile.create({
      data: {
        email: 'test-customer@example.com',
        fullName: 'Test Customer',
        phone: '+254700000001',
        role: 'client',
        password: 'hashedpassword123'
      }
    });
    console.log('✅ Test customer created:', testCustomer.id);

    // Create test service category
    console.log('📂 Creating test service category...');
    const testCategory = await prisma.serviceCategory.create({
      data: {
        name: 'Test Category',
        description: 'A test category for escrow functionality',
        slug: 'test-category-escrow',
        level: 1,
        position: 1
      }
    });
    console.log('✅ Test service category created:', testCategory.id);

    // Create test service
    console.log('🔧 Creating test service...');
    const testService = await prisma.service.create({
      data: {
        name: 'Test Service for Escrow',
        description: 'A test service for escrow functionality',
        price: 1000.00,
        durationMinutes: 60,
        vendorId: testVendor.id,
        categoryId: testCategory.id,
        isActive: true,
        imageUrl: 'https://example.com/test-service.jpg'
      }
    });
    console.log('✅ Test service created:', testService.id);

    // Create test order
    console.log('📦 Creating test order...');
    const testOrder = await prisma.order.create({
      data: {
        customerEmail: 'test-customer@example.com',
        customerPhone: '+254700000001',
        totalAmount: 1000.00,
        currency: 'KES',
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'paystack',
        paystackReference: 'TST_escrow_test_123'
      }
    });
    console.log('✅ Test order created:', testOrder.id);

    // Create test service appointment
    console.log('📅 Creating test service appointment...');
    const testAppointment = await prisma.serviceAppointment.create({
      data: {
        orderId: testOrder.id,
        serviceId: testService.id,
        vendorId: testVendor.id,
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        durationMinutes: 60,
        servicePrice: 1000.00,
        currency: 'KES',
        status: 'pending'
      }
    });
    console.log('✅ Test service appointment created:', testAppointment.id);

    // Test 1: Create escrow
    console.log('\n🔒 Test 1: Creating escrow...');
    const escrow = await escrowService.createEscrow({
      orderId: testOrder.id,
      serviceId: testService.id,
      vendorId: testVendor.id,
      customerId: testCustomer.id,
      amount: 1000.00,
      currency: 'KES',
      paystackReference: 'TST_escrow_test_123',
      createdBy: testVendor.id
    });
    console.log('✅ Escrow created:', escrow.id);
    console.log('   Status:', escrow.status);
    console.log('   Auto-release date:', escrow.autoReleaseDate);

    // Test 2: Start service
    console.log('\n🚀 Test 2: Starting service...');
    const startedEscrow = await escrowService.startService(escrow.id, testVendor.id);
    console.log('✅ Service started');
    console.log('   Status:', startedEscrow.status);

    // Test 3: Complete service
    console.log('\n✅ Test 3: Completing service...');
    const completedEscrow = await escrowService.completeService(escrow.id, testVendor.id);
    console.log('✅ Service completed');
    console.log('   Status:', completedEscrow.status);

    // Test 4: Customer approval
    console.log('\n👍 Test 4: Customer approval...');
    const approvedEscrow = await escrowService.approveService(escrow.id, testCustomer.id);
    console.log('✅ Service approved by customer');
    console.log('   Status:', approvedEscrow.status);

    // Test 5: Admin release funds
    console.log('\n💰 Test 5: Admin releasing funds...');
    const releasedEscrow = await escrowService.adminReleaseFunds(escrow.id, 'admin-user-id', 'Service completed successfully');
    console.log('✅ Funds released by admin');
    console.log('   Status:', releasedEscrow.status);
    console.log('   Released at:', releasedEscrow.releasedAt);

    // Test 6: Test dispute scenario
    console.log('\n⚠️ Test 6: Testing dispute scenario...');
    
    // Create another escrow for dispute testing
    const disputeOrder = await prisma.order.create({
      data: {
        customerEmail: 'test-customer@example.com',
        customerPhone: '+254700000001',
        totalAmount: 500.00,
        currency: 'KES',
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'paystack',
        paystackReference: 'TST_dispute_test_123'
      }
    });

    const disputeAppointment = await prisma.serviceAppointment.create({
      data: {
        orderId: disputeOrder.id,
        serviceId: testService.id,
        vendorId: testVendor.id,
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        durationMinutes: 60,
        servicePrice: 500.00,
        currency: 'KES',
        status: 'pending'
      }
    });

    const disputeEscrow = await escrowService.createEscrow({
      orderId: disputeOrder.id,
      serviceId: testService.id,
      vendorId: testVendor.id,
      customerId: testCustomer.id,
      amount: 500.00,
      currency: 'KES',
      paystackReference: 'TST_dispute_test_123',
      createdBy: testVendor.id
    });

    const disputedEscrow = await escrowService.disputeService(disputeEscrow.id, testCustomer.id, 'Service quality was poor');
    console.log('✅ Dispute created');
    console.log('   Status:', disputedEscrow.status);
    console.log('   Dispute reason:', disputedEscrow.disputeReason);

    // Test 7: Test auto-release mechanism
    console.log('\n⏰ Test 7: Testing auto-release mechanism...');
    
    // Create an escrow that should be auto-released (set auto-release date to past)
    const autoReleaseOrder = await prisma.order.create({
      data: {
        customerEmail: 'test-customer@example.com',
        customerPhone: '+254700000001',
        totalAmount: 750.00,
        currency: 'KES',
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'paystack',
        paystackReference: 'TST_auto_release_test_123'
      }
    });

    const autoReleaseAppointment = await prisma.serviceAppointment.create({
      data: {
        orderId: autoReleaseOrder.id,
        serviceId: testService.id,
        vendorId: testVendor.id,
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        durationMinutes: 60,
        servicePrice: 750.00,
        currency: 'KES',
        status: 'pending'
      }
    });

    const autoReleaseEscrow = await escrowService.createEscrow({
      orderId: autoReleaseOrder.id,
      serviceId: testService.id,
      vendorId: testVendor.id,
      customerId: testCustomer.id,
      amount: 750.00,
      currency: 'KES',
      paystackReference: 'TST_auto_release_test_123',
      createdBy: testVendor.id
    });

    // Manually set auto-release date to past for testing
    await prisma.serviceEscrow.update({
      where: { id: autoReleaseEscrow.id },
      data: { autoReleaseDate: new Date(Date.now() - 60 * 60 * 1000) } // 1 hour ago
    });

    await escrowService.processAutoRelease();
    console.log('✅ Auto-release processed');

    // Test 8: Get escrow statistics
    console.log('\n📊 Test 8: Getting escrow statistics...');
    const vendorEscrows = await escrowService.getEscrowsByVendor(testVendor.id);
    const customerEscrows = await escrowService.getEscrowsByCustomer(testCustomer.id);
    const allEscrows = await escrowService.getAllEscrows();
    
    console.log('✅ Escrow statistics retrieved');
    console.log('   Vendor escrows:', vendorEscrows.length);
    console.log('   Customer escrows:', customerEscrows.length);
    console.log('   Total escrows:', allEscrows.length);

    console.log('\n🎉 All escrow system tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await prisma.escrowAction.deleteMany({
      where: {
        escrow: {
          order: {
            customerEmail: 'test-customer@example.com'
          }
        }
      }
    });
    await prisma.serviceEscrow.deleteMany({
      where: {
        order: {
          customerEmail: 'test-customer@example.com'
        }
      }
    });
    await prisma.serviceAppointment.deleteMany({
      where: {
        order: {
          customerEmail: 'test-customer@example.com'
        }
      }
    });
    await prisma.order.deleteMany({
      where: {
        customerEmail: 'test-customer@example.com'
      }
    });
    await prisma.service.deleteMany({
      where: {
        name: 'Test Service for Escrow'
      }
    });
    await prisma.profile.deleteMany({
      where: {
        email: 'test-vendor@example.com'
      }
    });
    await prisma.profile.deleteMany({
      where: {
        email: 'test-customer@example.com'
      }
    });
    console.log('✅ Test data cleaned up');
    
    await prisma.$disconnect();
  }
}

// Run the test
testEscrowSystem().catch(console.error);
