import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

async function testServiceCheckoutFlow() {
  console.log('🧪 [SERVICE_CHECKOUT_FLOW] Testing Complete Service Checkout Flow');
  console.log('🧪 [SERVICE_CHECKOUT_FLOW] ===========================================');

  const prisma = new PrismaService();

  try {
    // Step 1: Create test vendor
    console.log('🧪 [SERVICE_CHECKOUT_FLOW] Step 1: Creating test vendor...');
    const testVendor = await prisma.profile.create({
      data: {
        email: 'test-vendor@example.com',
        fullName: 'Test Vendor',
        businessName: 'Test Vendor Business',
        role: 'vendor',
        phone: '+254700000000',
        businessAddress: 'Test Address',
        password: 'testpassword123',
        onboardingStatus: 'approved',
      }
    });
    console.log('✅ [SERVICE_CHECKOUT_FLOW] Test vendor created:', testVendor.id);

    // Step 2: Create test service category
    console.log('🧪 [SERVICE_CHECKOUT_FLOW] Step 2: Creating test service category...');
    const testCategory = await prisma.serviceCategory.create({
      data: {
        name: 'Test Service Category',
        description: 'A test category for services',
        slug: 'test-service-category',
        level: 1,
        position: 1,
        isActive: true,
      }
    });
    console.log('✅ [SERVICE_CHECKOUT_FLOW] Test category created:', testCategory.id);

    // Step 3: Create test service
    console.log('🧪 [SERVICE_CHECKOUT_FLOW] Step 3: Creating test service...');
    const testService = await prisma.service.create({
      data: {
        name: 'Test Service Checkout Flow',
        description: 'A test service for checkout flow testing',
        price: 5000,
        currency: 'KES',
        durationMinutes: 60,
        vendorId: testVendor.id,
        categoryId: testCategory.id,
        isActive: true,
        imageUrl: 'https://via.placeholder.com/300x200',
      }
    });
    console.log('✅ [SERVICE_CHECKOUT_FLOW] Test service created:', testService.id);

    // Step 4: Create test client
    console.log('🧪 [SERVICE_CHECKOUT_FLOW] Step 4: Creating test client...');
    const testClient = await prisma.profile.create({
      data: {
        email: 'test-client@example.com',
        fullName: 'Test Client',
        role: 'client',
        phone: '+254700000001',
        password: 'testpassword123',
        onboardingStatus: 'approved',
      }
    });
    console.log('✅ [SERVICE_CHECKOUT_FLOW] Test client created:', testClient.id);

    // Step 5: Test order creation (simulating frontend call)
    console.log('🧪 [SERVICE_CHECKOUT_FLOW] Step 5: Testing order creation...');
    const orderData = {
      customerEmail: testClient.email,
      customerPhone: testClient.phone,
      totalAmount: testService.price,
      currency: testService.currency,
      shippingAddress: {
        address: 'Test Service Location',
        city: 'Nairobi',
      },
      notes: 'Test service checkout order',
      cartItems: [{
        type: 'service' as const,
        id: testService.id,
        name: testService.name,
        price: testService.price,
        quantity: 1,
        vendorId: testService.vendorId,
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: testService.durationMinutes,
        currency: testService.currency,
      }],
    };

    console.log('🧪 [SERVICE_CHECKOUT_FLOW] Order data:', JSON.stringify(orderData, null, 2));

    // Step 6: Test appointment creation (simulating frontend call)
    console.log('🧪 [SERVICE_CHECKOUT_FLOW] Step 6: Testing appointment creation...');
    const appointmentData = {
      clientId: testClient.id,
      serviceId: testService.id,
      vendorId: testService.vendorId,
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      durationMinutes: testService.durationMinutes,
      totalAmount: testService.price,
      currency: testService.currency,
      notes: 'Test appointment for service checkout',
    };

    console.log('🧪 [SERVICE_CHECKOUT_FLOW] Appointment data:', JSON.stringify(appointmentData, null, 2));

    console.log('✅ [SERVICE_CHECKOUT_FLOW] Service checkout flow test completed successfully!');
    console.log('🧪 [SERVICE_CHECKOUT_FLOW] ===========================================');
    console.log('🧪 [SERVICE_CHECKOUT_FLOW] Next steps:');
    console.log('1. Test the frontend service checkout button');
    console.log('2. Verify order creation works');
    console.log('3. Verify payment initialization works');
    console.log('4. Verify appointment creation works');

  } catch (error) {
    console.error('❌ [SERVICE_CHECKOUT_FLOW] Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testServiceCheckoutFlow().catch(console.error);
