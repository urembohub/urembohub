/**
 * Test Complete Email Integration
 * 
 * This script tests the complete email integration including:
 * - Order creation with partner notifications
 * - Payment processing with partner notifications
 * - All email templates working together
 * 
 * Run with: npm run test:emails:integration
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';

const TEST_EMAIL = 'benardogutu65@gmail.com';

async function testEmailIntegration() {
  console.log('🚀 Testing Complete Email Integration...');
  console.log('=' .repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const ordersService = app.get(OrdersService);
  const paymentsService = app.get(PaymentsService);
  const prisma = app.get(PrismaService);

  let testVendor: any;
  let testRetailer: any;
  let testManufacturer: any;
  let testProduct: any;
  let testService: any;

  try {
    // Step 1: Create test partners
    console.log('👥 Step 1: Creating test partners...');
    
    testVendor = await prisma.profile.create({
      data: {
        email: 'vendor-test@example.com',
        password: 'hashedpassword',
        fullName: 'Test Vendor',
        role: 'vendor',
        businessName: 'Vendor Business',
        isVerified: true
      }
    });
    console.log('✅ Test vendor created:', testVendor.id);

    testRetailer = await prisma.profile.create({
      data: {
        email: 'retailer-test@example.com',
        password: 'hashedpassword',
        fullName: 'Test Retailer',
        role: 'retailer',
        businessName: 'Retailer Business',
        isVerified: true
      }
    });
    console.log('✅ Test retailer created:', testRetailer.id);

    testManufacturer = await prisma.profile.create({
      data: {
        email: 'manufacturer-test@example.com',
        password: 'hashedpassword',
        fullName: 'Test Manufacturer',
        role: 'manufacturer',
        businessName: 'Manufacturer Business',
        isVerified: true
      }
    });
    console.log('✅ Test manufacturer created:', testManufacturer.id);

    // Step 2: Create test products and services
    console.log('📦 Step 2: Creating test products and services...');
    
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        description: 'A test product for integration testing',
        price: 99.99,
        currency: 'USD',
        retailerId: testRetailer.id,
        stockQuantity: 10,
        isActive: true
      }
    });
    console.log('✅ Test product created:', testProduct.id);

    testService = await prisma.service.create({
      data: {
        name: 'Test Service',
        description: 'A test service for integration testing',
        price: 149.99,
        currency: 'USD',
        vendorId: testVendor.id,
        durationMinutes: 60,
        isActive: true
      }
    });
    console.log('✅ Test service created:', testService.id);

    // Step 3: Create order with products and services
    console.log('🛒 Step 3: Creating order with products and services...');
    const createOrderDto = {
      cartItems: [
        {
          type: 'product' as const,
          id: testProduct.id,
          name: testProduct.name,
          price: Number(testProduct.price),
          quantity: 2,
          vendorId: testRetailer.id,
          currency: 'USD'
        },
        {
          type: 'service' as const,
          id: testService.id,
          name: testService.name,
          price: Number(testService.price),
          vendorId: testVendor.id,
          appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          durationMinutes: 60,
          currency: 'USD'
        }
      ],
      customerEmail: TEST_EMAIL,
      customerPhone: '+1234567890',
      shippingAddress: {
        address: '123 Test Street',
        city: 'Test City'
      },
      notes: 'Integration test order',
      currency: 'USD',
      totalAmount: (Number(testProduct.price) * 2) + Number(testService.price)
    };

    const order = await ordersService.createOrder(null, createOrderDto);
    console.log('✅ Order created:', order.id);
    console.log('📧 Order creation should have triggered partner notifications');

    // Wait for email processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: Simulate payment processing
    console.log('💳 Step 4: Simulating payment processing...');
    const paymentData = {
      amount: Number(order.totalAmount),
      currency: order.currency,
      email: TEST_EMAIL,
      reference: `test_payment_${Date.now()}`,
      metadata: { orderId: order.id }
    };

    // Initialize payment
    const paymentInit = await paymentsService.initializePayment(paymentData);
    console.log('✅ Payment initialized:', paymentInit.success);

    // Simulate payment callback (successful payment)
    const paymentCallback = await paymentsService.handlePaymentCallback(paymentData.reference);
    console.log('✅ Payment callback processed:', paymentCallback.success);
    console.log('📧 Payment processing should have triggered partner notifications');

    // Wait for email processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('');
    console.log('🎉 Complete email integration test completed!');
    console.log('📬 Check your email at benardogutu65@gmail.com for all notifications:');
    console.log('  - Customer order confirmation');
    console.log('  - Vendor new order notification');
    console.log('  - Retailer new order notification');
    console.log('  - Vendor payment notification');
    console.log('  - Retailer payment notification');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
  } finally {
    // Cleanup: Delete test data
    try {
      if (testProduct) {
        await prisma.product.delete({ where: { id: testProduct.id } });
      }
      if (testService) {
        await prisma.service.delete({ where: { id: testService.id } });
      }
      if (testVendor) {
        await prisma.profile.delete({ where: { id: testVendor.id } });
      }
      if (testRetailer) {
        await prisma.profile.delete({ where: { id: testRetailer.id } });
      }
      if (testManufacturer) {
        await prisma.profile.delete({ where: { id: testManufacturer.id } });
      }
      console.log('🧹 Test data cleaned up');
    } catch (cleanupError) {
      console.error('⚠️ Cleanup failed:', cleanupError);
    }

    await app.close();
  }
}

testEmailIntegration();
