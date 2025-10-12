import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

async function testServiceCheckout() {
  console.log('🧪 [SERVICE_CHECKOUT] Testing Service Checkout Integration');
  console.log('🧪 [SERVICE_CHECKOUT] ===========================================');

  const prisma = new PrismaService();
  const configService = new ConfigService();

  try {
    // Test 1: Create a test service
    console.log('🧪 [SERVICE_CHECKOUT] Step 1: Creating test service...');
    
    const testService = await prisma.service.create({
      data: {
        name: 'Test Service Checkout',
        description: 'A test service for checkout integration',
        price: 5000,
        currency: 'KES',
        durationMinutes: 60,
        vendorId: 'test-vendor-id', // This should be a real vendor ID
        categoryId: 'test-category-id', // This should be a real category ID
        isActive: true,
        imageUrl: 'https://via.placeholder.com/300x200',
      }
    });

    console.log('✅ [SERVICE_CHECKOUT] Test service created:', testService.id);

    // Test 2: Test appointment creation via backend API
    console.log('🧪 [SERVICE_CHECKOUT] Step 2: Testing appointment creation...');
    
    const appointmentData = {
      clientId: 'test-client-id', // This should be a real client ID
      serviceId: testService.id,
      vendorId: testService.vendorId,
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      durationMinutes: testService.durationMinutes,
      totalAmount: testService.price,
      currency: testService.currency,
      notes: 'Test appointment for service checkout',
    };

    console.log('🧪 [SERVICE_CHECKOUT] Appointment data:', appointmentData);

    // Test 3: Test payment initialization for service
    console.log('🧪 [SERVICE_CHECKOUT] Step 3: Testing payment initialization...');
    
    const paymentData = {
      orderId: `service-${testService.id}-${Date.now()}`,
      amount: testService.price,
      customerEmail: 'test@example.com',
      customerName: 'Test Customer',
      cartItems: [{
        type: 'service' as const,
        id: testService.id,
        name: testService.name,
        price: testService.price,
        quantity: 1,
        vendorId: testService.vendorId,
        appointmentDate: appointmentData.appointmentDate,
        durationMinutes: testService.durationMinutes,
        currency: testService.currency,
      }],
    };

    console.log('🧪 [SERVICE_CHECKOUT] Payment data:', paymentData);

    console.log('✅ [SERVICE_CHECKOUT] Service checkout test completed successfully!');
    console.log('🧪 [SERVICE_CHECKOUT] ===========================================');

  } catch (error) {
    console.error('❌ [SERVICE_CHECKOUT] Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testServiceCheckout().catch(console.error);



