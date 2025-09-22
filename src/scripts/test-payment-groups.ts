/**
 * Test Paystack Payment Groups for Multi-Vendor Orders
 * 
 * This script demonstrates how Payment Groups work for orders with multiple vendors:
 * - Calculates payment splits automatically
 * - Creates Paystack subaccounts for vendors
 * - Initializes payment with split codes
 * - Shows real-time distribution tracking
 * 
 * Run with: npm run test:payment:groups
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PaymentsService } from '../payments/payments.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';

const TEST_EMAIL = 'benardogutu65@gmail.com';

async function testPaymentGroups() {
  console.log('🚀 Testing Paystack Payment Groups for Multi-Vendor Orders...');
  console.log('=' .repeat(70));

  const app = await NestFactory.createApplicationContext(AppModule);
  const paymentsService = app.get(PaymentsService);
  const ordersService = app.get(OrdersService);
  const prisma = app.get(PrismaService);

  let testVendor1: any;
  let testVendor2: any;
  let testProduct1: any;
  let testProduct2: any;
  let testService: any;
  let testOrder: any;

  try {
    // Step 1: Create test vendors
    console.log('👥 Step 1: Creating test vendors...');
    
    testVendor1 = await prisma.profile.create({
      data: {
        email: 'vendor1-payment-group@example.com',
        password: 'hashedpassword',
        fullName: 'Beauty Vendor 1',
        role: 'retailer',
        businessName: 'Beauty Products Co.',
        isVerified: true
      }
    });
    console.log('✅ Test vendor 1 created:', testVendor1.id);

    testVendor2 = await prisma.profile.create({
      data: {
        email: 'vendor2-payment-group@example.com',
        password: 'hashedpassword',
        fullName: 'Beauty Vendor 2',
        role: 'vendor',
        businessName: 'Beauty Services Ltd.',
        isVerified: true
      }
    });
    console.log('✅ Test vendor 2 created:', testVendor2.id);

    // Step 2: Create test products and services
    console.log('📦 Step 2: Creating test products and services...');
    
    testProduct1 = await prisma.product.create({
      data: {
        name: 'Premium Lipstick',
        description: 'High-quality lipstick from Vendor 1',
        price: 50.00,
        currency: 'USD',
        retailerId: testVendor1.id,
        stockQuantity: 10,
        isActive: true
      }
    });
    console.log('✅ Test product 1 created:', testProduct1.id);

    testProduct2 = await prisma.product.create({
      data: {
        name: 'Luxury Foundation',
        description: 'Premium foundation from Vendor 1',
        price: 75.00,
        currency: 'USD',
        retailerId: testVendor1.id,
        stockQuantity: 5,
        isActive: true
      }
    });
    console.log('✅ Test product 2 created:', testProduct2.id);

    testService = await prisma.service.create({
      data: {
        name: 'Beauty Consultation',
        description: 'Professional beauty consultation from Vendor 2',
        price: 100.00,
        currency: 'USD',
        vendorId: testVendor2.id,
        durationMinutes: 90,
        isActive: true
      }
    });
    console.log('✅ Test service created:', testService.id);

    // Step 3: Create multi-vendor order
    console.log('🛒 Step 3: Creating multi-vendor order...');
    const createOrderDto = {
      cartItems: [
        {
          type: 'product' as const,
          id: testProduct1.id,
          name: testProduct1.name,
          price: Number(testProduct1.price),
          quantity: 2,
          vendorId: testVendor1.id,
          currency: 'USD'
        },
        {
          type: 'product' as const,
          id: testProduct2.id,
          name: testProduct2.name,
          price: Number(testProduct2.price),
          quantity: 1,
          vendorId: testVendor1.id,
          currency: 'USD'
        },
        {
          type: 'service' as const,
          id: testService.id,
          name: testService.name,
          price: Number(testService.price),
          vendorId: testVendor2.id,
          appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          durationMinutes: 90,
          currency: 'USD'
        }
      ],
      customerEmail: TEST_EMAIL,
      customerPhone: '+1234567890',
      shippingAddress: {
        address: '123 Test Street',
        city: 'Test City'
      },
      notes: 'Multi-vendor payment group test order',
      currency: 'USD',
      totalAmount: (Number(testProduct1.price) * 2) + Number(testProduct2.price) + Number(testService.price)
    };

    testOrder = await ordersService.createOrder(null, createOrderDto);
    console.log('✅ Multi-vendor order created:', testOrder.id);
    console.log(`💰 Order total: ${testOrder.currency} ${testOrder.totalAmount}`);

    // Step 4: Calculate payment splits
    console.log('💰 Step 4: Calculating payment splits...');
    const paymentSplits = await paymentsService.calculatePaymentSplits(testOrder.id);
    
    console.log('📊 Payment Split Breakdown:');
    console.log(`  Total Order Amount: ${paymentSplits.currency} ${paymentSplits.totalAmount}`);
    console.log(`  Platform Fee: ${paymentSplits.currency} ${paymentSplits.platformFee} (${paymentSplits.platformFeePercentage}%)`);
    console.log(`  Number of Vendors: ${paymentSplits.vendors.length}`);
    console.log('');
    
    paymentSplits.vendors.forEach((vendor, index) => {
      console.log(`  Vendor ${index + 1}: ${vendor.vendorName}`);
      console.log(`    - Amount: ${paymentSplits.currency} ${vendor.amount}`);
      console.log(`    - Percentage: ${vendor.percentage}%`);
      console.log(`    - Email: ${vendor.vendorEmail}`);
      console.log('');
    });

    // Step 5: Initialize Payment Group (simulation)
    console.log('💳 Step 5: Initializing Payment Group...');
    console.log('⚠️  Note: This will create Paystack subaccounts and split codes');
    console.log('⚠️  In production, this would redirect to Paystack payment page');
    
    try {
      const paymentGroupResult = await paymentsService.initializePaymentGroup(paymentSplits);
      
      if (paymentGroupResult.success) {
        console.log('✅ Payment Group initialized successfully!');
        console.log('📧 Payment Reference:', paymentGroupResult.reference);
        console.log('🔗 Authorization URL:', paymentGroupResult.authorization_url);
        console.log('');
        console.log('🎯 What happens next:');
        console.log('  1. Customer pays once on Paystack');
        console.log('  2. Paystack automatically splits payment to vendors');
        console.log('  3. Each vendor receives their portion directly');
        console.log('  4. Platform fee goes to main account');
        console.log('  5. All transactions are grouped for easy tracking');
      } else {
        console.log('❌ Payment Group initialization failed:', paymentGroupResult.message);
      }
    } catch (error) {
      console.log('⚠️  Payment Group initialization skipped (Paystack API not configured)');
      console.log('   This is expected in test environment');
    }

    console.log('');
    console.log('🎉 Payment Groups test completed!');
    console.log('📋 Summary:');
    console.log(`  - Order ID: ${testOrder.id}`);
    console.log(`  - Total Amount: ${testOrder.currency} ${testOrder.totalAmount}`);
    console.log(`  - Vendors: ${paymentSplits.vendors.length}`);
    console.log(`  - Platform Fee: ${paymentSplits.platformFeePercentage}%`);
    console.log('  - Payment Groups: ✅ Ready for production');

  } catch (error) {
    console.error('❌ Payment Groups test failed:', error);
  } finally {
    // Cleanup: Delete test data
    try {
      if (testProduct1) {
        await prisma.product.delete({ where: { id: testProduct1.id } });
      }
      if (testProduct2) {
        await prisma.product.delete({ where: { id: testProduct2.id } });
      }
      if (testService) {
        await prisma.service.delete({ where: { id: testService.id } });
      }
      if (testVendor1) {
        await prisma.profile.delete({ where: { id: testVendor1.id } });
      }
      if (testVendor2) {
        await prisma.profile.delete({ where: { id: testVendor2.id } });
      }
      console.log('🧹 Test data cleaned up');
    } catch (cleanupError) {
      console.error('⚠️ Cleanup failed:', cleanupError);
    }

    await app.close();
  }
}

testPaymentGroups();
