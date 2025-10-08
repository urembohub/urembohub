import { PrismaClient } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { CartCleanupService } from '../cart/cart-cleanup.service';
import { PrismaService } from '../prisma/prisma.service';

const prisma = new PrismaClient();

async function testDeletionCascade() {
  console.log('🧪 Testing Deletion Cascade Functionality...\n');

  try {
    // Step 1: Create test users
    console.log('📝 Step 1: Creating test users...');
    const testRetailer = await prisma.profile.create({
      data: {
        email: 'test-retailer@example.com',
        fullName: 'Test Retailer',
        businessName: 'Test Retail Store',
        role: 'retailer',
        phone: '+254700000001',
        businessAddress: 'Test Address',
        password: 'hashedpassword123',
        isVerified: true,
      }
    });

    const testVendor = await prisma.profile.create({
      data: {
        email: 'test-vendor@example.com',
        fullName: 'Test Vendor',
        businessName: 'Test Service Provider',
        role: 'vendor',
        phone: '+254700000002',
        businessAddress: 'Test Address',
        password: 'hashedpassword123',
        isVerified: true,
      }
    });

    const testClient = await prisma.profile.create({
      data: {
        email: 'test-client@example.com',
        fullName: 'Test Client',
        role: 'client',
        phone: '+254700000003',
        password: 'hashedpassword123',
        isVerified: true,
      }
    });

    console.log('✅ Test users created:', {
      retailer: testRetailer.id,
      vendor: testVendor.id,
      client: testClient.id
    });

    // Step 2: Create test products and services
    console.log('\n📦 Step 2: Creating test products and services...');
    const testProduct = await prisma.product.create({
      data: {
        name: 'Test Product for Deletion',
        description: 'This product should be deleted with the retailer',
        price: 100.00,
        currency: 'KES',
        stockQuantity: 10,
        retailerId: testRetailer.id,
        createdByRole: 'retailer',
        isActive: true,
      }
    });

    const testService = await prisma.service.create({
      data: {
        name: 'Test Service for Deletion',
        description: 'This service should be deleted with the vendor',
        price: 200.00,
        currency: 'KES',
        durationMinutes: 60,
        vendorId: testVendor.id,
        isActive: true,
      }
    });

    console.log('✅ Test products/services created:', {
      product: testProduct.id,
      service: testService.id
    });

    // Step 3: Create test wishlist items
    console.log('\n❤️ Step 3: Creating test wishlist items...');
    const wishlistProduct = await prisma.wishlist.create({
      data: {
        userId: testClient.id,
        itemId: testProduct.id,
        itemType: 'product',
        productId: testProduct.id
      }
    });

    const wishlistService = await prisma.wishlist.create({
      data: {
        userId: testClient.id,
        itemId: testService.id,
        itemType: 'service',
        serviceId: testService.id
      }
    });

    console.log('✅ Test wishlist items created:', {
      productWishlist: wishlistProduct.id,
      serviceWishlist: wishlistService.id
    });

    // Step 4: Initialize services
    console.log('\n🔧 Step 4: Initializing services...');
    const prismaService = new PrismaService();
    const cartCleanupService = new CartCleanupService(prismaService);
    const usersService = new UsersService(prismaService, null as any, cartCleanupService);

    // Step 5: Verify data exists before deletion
    console.log('\n🔍 Step 5: Verifying data exists before deletion...');
    const [productCount, serviceCount, wishlistCount] = await Promise.all([
      prisma.product.count({ where: { retailerId: testRetailer.id } }),
      prisma.service.count({ where: { vendorId: testVendor.id } }),
      prisma.wishlist.count({ where: { userId: testClient.id } })
    ]);

    console.log('📊 Data counts before deletion:');
    console.log(`  - Products: ${productCount}`);
    console.log(`  - Services: ${serviceCount}`);
    console.log(`  - Wishlist items: ${wishlistCount}`);

    // Step 6: Delete retailer
    console.log('\n🗑️ Step 6: Deleting retailer...');
    const retailerDeletionResult = await usersService.deleteUser(testRetailer.id);
    console.log('✅ Retailer deletion result:', retailerDeletionResult);

    // Step 7: Delete vendor
    console.log('\n🗑️ Step 7: Deleting vendor...');
    const vendorDeletionResult = await usersService.deleteUser(testVendor.id);
    console.log('✅ Vendor deletion result:', vendorDeletionResult);

    // Step 8: Verify cascading deletes worked
    console.log('\n🔍 Step 8: Verifying cascading deletes...');
    
    // Check if users still exist
    const retailerExists = await prisma.profile.findUnique({
      where: { id: testRetailer.id }
    });
    const vendorExists = await prisma.profile.findUnique({
      where: { id: testVendor.id }
    });

    console.log(`👤 Retailer still exists: ${retailerExists ? 'YES (ERROR!)' : 'NO (GOOD!)'}`);
    console.log(`👤 Vendor still exists: ${vendorExists ? 'YES (ERROR!)' : 'NO (GOOD!)'}`);

    // Check if products/services still exist
    const productExists = await prisma.product.findUnique({
      where: { id: testProduct.id }
    });
    const serviceExists = await prisma.service.findUnique({
      where: { id: testService.id }
    });

    console.log(`📦 Product still exists: ${productExists ? 'YES (ERROR!)' : 'NO (GOOD!)'}`);
    console.log(`🔧 Service still exists: ${serviceExists ? 'YES (ERROR!)' : 'NO (GOOD!)'}`);

    // Check if wishlist items still exist
    const wishlistProductExists = await prisma.wishlist.findUnique({
      where: { id: wishlistProduct.id }
    });
    const wishlistServiceExists = await prisma.wishlist.findUnique({
      where: { id: wishlistService.id }
    });

    console.log(`❤️ Product wishlist still exists: ${wishlistProductExists ? 'YES (ERROR!)' : 'NO (GOOD!)'}`);
    console.log(`❤️ Service wishlist still exists: ${wishlistServiceExists ? 'YES (ERROR!)' : 'NO (GOOD!)'}`);

    // Final verification counts
    const [finalProductCount, finalServiceCount, finalWishlistCount] = await Promise.all([
      prisma.product.count({ where: { retailerId: testRetailer.id } }),
      prisma.service.count({ where: { vendorId: testVendor.id } }),
      prisma.wishlist.count({ where: { userId: testClient.id } })
    ]);

    console.log('\n📊 Final data counts:');
    console.log(`  - Products: ${finalProductCount}`);
    console.log(`  - Services: ${finalServiceCount}`);
    console.log(`  - Wishlist items: ${finalWishlistCount}`);

    // Step 9: Clean up remaining test data
    console.log('\n🧹 Step 9: Cleaning up remaining test data...');
    await prisma.profile.delete({ where: { id: testClient.id } });

    const allDeleted = !retailerExists && !vendorExists && !productExists && !serviceExists && 
                      !wishlistProductExists && !wishlistServiceExists;

    console.log('\n🎯 Test Results:');
    console.log(`✅ All cascading deletes working: ${allDeleted ? 'YES' : 'NO'}`);
    
    if (allDeleted) {
      console.log('🎉 SUCCESS: Deletion cascade is working correctly!');
      console.log('   - Users are properly deleted');
      console.log('   - Associated products are deleted');
      console.log('   - Associated services are deleted');
      console.log('   - Wishlist items are cleaned up');
    } else {
      console.log('❌ FAILURE: Some cascading deletes are not working properly');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDeletionCascade();
