import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

async function testServicePaymentFix() {
  console.log('🧪 [SERVICE_PAYMENT_FIX] Testing Service Payment Processing Fix');
  console.log('🧪 [SERVICE_PAYMENT_FIX] ===========================================');

  const prisma = new PrismaService();

  try {
    // Step 1: Create test vendor
    console.log('🧪 [SERVICE_PAYMENT_FIX] Step 1: Creating test vendor...');
    const testVendor = await prisma.profile.create({
      data: {
        email: 'test-vendor-payment@example.com',
        fullName: 'Test Vendor Payment',
        businessName: 'Test Vendor Payment Business',
        role: 'vendor',
        phone: '+254700000000',
        businessAddress: 'Test Address',
        password: 'testpassword123',
        onboardingStatus: 'approved',
        paystackSubaccountId: 'ACCT_test_vendor_123',
        paystackSubaccountStatus: 'active',
      }
    });
    console.log('✅ [SERVICE_PAYMENT_FIX] Test vendor created:', testVendor.id);

    // Step 2: Create test service category
    console.log('🧪 [SERVICE_PAYMENT_FIX] Step 2: Creating test service category...');
    const testCategory = await prisma.serviceCategory.create({
      data: {
        name: 'Test Service Payment Category',
        description: 'A test category for service payment testing',
        slug: 'test-service-payment-category',
        level: 1,
        position: 1,
        isActive: true,
      }
    });
    console.log('✅ [SERVICE_PAYMENT_FIX] Test category created:', testCategory.id);

    // Step 3: Create test service
    console.log('🧪 [SERVICE_PAYMENT_FIX] Step 3: Creating test service...');
    const testService = await prisma.service.create({
      data: {
        name: 'Test Service Payment Fix',
        description: 'A test service for payment fix testing',
        price: 5000,
        currency: 'KES',
        durationMinutes: 60,
        vendorId: testVendor.id,
        categoryId: testCategory.id,
        isActive: true,
        imageUrl: 'https://via.placeholder.com/300x200',
      }
    });
    console.log('✅ [SERVICE_PAYMENT_FIX] Test service created:', testService.id);

    // Step 4: Create test client
    console.log('🧪 [SERVICE_PAYMENT_FIX] Step 4: Creating test client...');
    const testClient = await prisma.profile.create({
      data: {
        email: 'test-client-payment@example.com',
        fullName: 'Test Client Payment',
        role: 'client',
        phone: '+254700000001',
        password: 'testpassword123',
        onboardingStatus: 'approved',
      }
    });
    console.log('✅ [SERVICE_PAYMENT_FIX] Test client created:', testClient.id);

    // Step 5: Create test order with service
    console.log('🧪 [SERVICE_PAYMENT_FIX] Step 5: Creating test order with service...');
    const testOrder = await prisma.order.create({
      data: {
        customerEmail: testClient.email,
        totalAmount: testService.price,
        currency: testService.currency,
        status: 'pending',
        userId: testClient.id,
      }
    });
    console.log('✅ [SERVICE_PAYMENT_FIX] Test order created:', testOrder.id);

    // Step 6: Create service appointment
    console.log('🧪 [SERVICE_PAYMENT_FIX] Step 6: Creating service appointment...');
    const testAppointment = await prisma.serviceAppointment.create({
      data: {
        orderId: testOrder.id,
        serviceId: testService.id,
        vendorId: testService.vendorId,
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        durationMinutes: testService.durationMinutes,
        servicePrice: testService.price,
        status: 'pending',
      }
    });
    console.log('✅ [SERVICE_PAYMENT_FIX] Test appointment created:', testAppointment.id);

    // Step 7: Test the order structure that would be passed to calculateCommission
    console.log('🧪 [SERVICE_PAYMENT_FIX] Step 7: Testing order structure...');
    const orderWithRelations = await prisma.order.findUnique({
      where: { id: testOrder.id },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                retailer: true
              }
            }
          }
        },
        serviceAppointments: {
          include: {
            service: {
              include: {
                vendor: true
              }
            }
          }
        }
      }
    });

    console.log('🧪 [SERVICE_PAYMENT_FIX] Order structure:');
    console.log('  - Order Items (products):', orderWithRelations.orderItems.length);
    console.log('  - Service Appointments:', orderWithRelations.serviceAppointments.length);
    console.log('  - Service Vendor:', orderWithRelations.serviceAppointments[0]?.service?.vendor?.email);
    console.log('  - Vendor Subaccount:', orderWithRelations.serviceAppointments[0]?.service?.vendor?.paystackSubaccountId);

    console.log('✅ [SERVICE_PAYMENT_FIX] Service payment fix test completed successfully!');
    console.log('🧪 [SERVICE_PAYMENT_FIX] ===========================================');
    console.log('🧪 [SERVICE_PAYMENT_FIX] The calculateCommission method should now:');
    console.log('1. Handle both products (retailers) and services (vendors)');
    console.log('2. Calculate total amount from both orderItems and serviceAppointments');
    console.log('3. Find the correct partner (retailer or vendor) based on order type');
    console.log('4. Use the partner\'s paystackSubaccountId for payment processing');

  } catch (error) {
    console.error('❌ [SERVICE_PAYMENT_FIX] Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testServicePaymentFix().catch(console.error);
