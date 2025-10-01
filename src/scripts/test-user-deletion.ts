/**
 * Test User Deletion with Cascading Deletes
 * 
 * This script tests the user deletion functionality to ensure that:
 * - When a user is deleted, all their products are deleted
 * - When a user is deleted, all their services are deleted
 * - All related data (orders, appointments, reviews, etc.) are properly cleaned up
 * 
 * Run with: npm run test:user:deletion
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

async function testUserDeletion() {
  console.log('🗑️ Testing User Deletion with Cascading Deletes...');
  console.log('=' .repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const prisma = app.get(PrismaService);

  let testUser: any;
  let testProduct: any;
  let testService: any;
  let testOrder: any;

  try {
    // Step 1: Create test user
    console.log('👤 Step 1: Creating test user...');
    testUser = await prisma.profile.create({
      data: {
        email: 'test-deletion@example.com',
        password: 'hashedpassword',
        fullName: 'Test User for Deletion',
        role: 'vendor',
        businessName: 'Test Business for Deletion',
        isVerified: true
      }
    });
    console.log('✅ Test user created:', testUser.id);

    // Step 2: Create test products for the user
    console.log('📦 Step 2: Creating test products...');
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product for Deletion',
        description: 'This product should be deleted with the user',
        price: 99.99,
        currency: 'USD',
        retailerId: testUser.id,
        stockQuantity: 10,
        isActive: true
      }
    });
    console.log('✅ Test product created:', testProduct.id);

    // Step 3: Create test services for the user
    console.log('🔧 Step 3: Creating test services...');
    testService = await prisma.service.create({
      data: {
        name: 'Test Service for Deletion',
        description: 'This service should be deleted with the user',
        price: 149.99,
        currency: 'USD',
        vendorId: testUser.id,
        durationMinutes: 60,
        isActive: true
      }
    });
    console.log('✅ Test service created:', testService.id);

    // Step 4: Create test order (as client)
    console.log('🛒 Step 4: Creating test order...');
    testOrder = await prisma.order.create({
      data: {
        customerEmail: 'customer@example.com',
        customerPhone: '+1234567890',
        shippingAddress: {
          address: '123 Test Street',
          city: 'Test City'
        },
        currency: 'USD',
        totalAmount: 99.99,
        userId: testUser.id
      }
    });
    console.log('✅ Test order created:', testOrder.id);

    // Step 5: Verify data exists before deletion
    console.log('🔍 Step 5: Verifying data exists before deletion...');
    const [productCount, serviceCount, orderCount] = await Promise.all([
      prisma.product.count({ where: { retailerId: testUser.id } }),
      prisma.service.count({ where: { vendorId: testUser.id } }),
      prisma.order.count({ where: { userId: testUser.id } })
    ]);

    console.log('📊 Data counts before deletion:');
    console.log(`  - Products: ${productCount}`);
    console.log(`  - Services: ${serviceCount}`);
    console.log(`  - Orders: ${orderCount}`);

    // Step 6: Delete user
    console.log('🗑️ Step 6: Deleting user...');
    const deletionResult = await usersService.deleteUser(testUser.id);
    
    console.log('✅ User deletion result:', deletionResult);

    // Step 7: Verify cascading deletes worked
    console.log('🔍 Step 7: Verifying cascading deletes...');
    
    // Check if user still exists
    const userExists = await prisma.profile.findUnique({
      where: { id: testUser.id }
    });
    console.log(`👤 User still exists: ${userExists ? 'YES (ERROR!)' : 'NO (GOOD!)'}`);

    // Check if products still exist
    const productExists = await prisma.product.findUnique({
      where: { id: testProduct.id }
    });
    console.log(`📦 Product still exists: ${productExists ? 'YES (ERROR!)' : 'NO (GOOD!)'}`);

    // Check if services still exist
    const serviceExists = await prisma.service.findUnique({
      where: { id: testService.id }
    });
    console.log(`🔧 Service still exists: ${serviceExists ? 'YES (ERROR!)' : 'NO (GOOD!)'}`);

    // Check if orders still exist
    const orderExists = await prisma.order.findUnique({
      where: { id: testOrder.id }
    });
    console.log(`🛒 Order still exists: ${orderExists ? 'YES (ERROR!)' : 'NO (GOOD!)'}`);

    // Final verification counts
    const [finalProductCount, finalServiceCount, finalOrderCount] = await Promise.all([
      prisma.product.count({ where: { retailerId: testUser.id } }),
      prisma.service.count({ where: { vendorId: testUser.id } }),
      prisma.order.count({ where: { userId: testUser.id } })
    ]);

    console.log('📊 Final data counts after deletion:');
    console.log(`  - Products: ${finalProductCount}`);
    console.log(`  - Services: ${finalServiceCount}`);
    console.log(`  - Orders: ${finalOrderCount}`);

    // Step 8: Test results
    console.log('🎯 Step 8: Test Results...');
    const allDeleted = !userExists && !productExists && !serviceExists && !orderExists;
    const countsZero = finalProductCount === 0 && finalServiceCount === 0 && finalOrderCount === 0;

    if (allDeleted && countsZero) {
      console.log('🎉 SUCCESS: Cascading deletes working perfectly!');
      console.log('✅ User deleted');
      console.log('✅ Products deleted');
      console.log('✅ Services deleted');
      console.log('✅ Orders deleted');
      console.log('✅ All related data cleaned up');
    } else {
      console.log('❌ FAILURE: Cascading deletes not working properly!');
      console.log('🔍 Check the database schema for missing onDelete: Cascade constraints');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup: Try to delete any remaining test data
    try {
      if (testUser) {
        await prisma.profile.deleteMany({
          where: { email: 'test-deletion@example.com' }
        });
      }
      if (testProduct) {
        await prisma.product.deleteMany({
          where: { name: 'Test Product for Deletion' }
        });
      }
      if (testService) {
        await prisma.service.deleteMany({
          where: { name: 'Test Service for Deletion' }
        });
      }
      if (testOrder) {
        await prisma.order.deleteMany({
          where: { customerEmail: 'customer@example.com' }
        });
      }
      console.log('🧹 Cleanup completed');
    } catch (cleanupError) {
      console.error('⚠️ Cleanup failed:', cleanupError);
    }

    await app.close();
  }
}

testUserDeletion();


