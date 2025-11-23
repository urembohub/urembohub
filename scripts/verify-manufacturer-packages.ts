import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyManufacturerPackages() {
  try {
    const manufacturerEmail = 'manu@test.com';
    
    console.log('🔍 [VERIFY] Starting verification for manufacturer:', manufacturerEmail);
    console.log('='.repeat(80));

    // Step 1: Find manufacturer by email
    const manufacturer = await prisma.profile.findUnique({
      where: { email: manufacturerEmail },
      select: {
        id: true,
        email: true,
        fullName: true,
        businessName: true,
        role: true,
      },
    });

    if (!manufacturer) {
      console.error('❌ [VERIFY] Manufacturer not found with email:', manufacturerEmail);
      return;
    }

    console.log('✅ [VERIFY] Manufacturer found:');
    console.log('   ID:', manufacturer.id);
    console.log('   Email:', manufacturer.email);
    console.log('   Name:', manufacturer.fullName || manufacturer.businessName);
    console.log('   Role:', manufacturer.role);
    console.log('');

    // Step 2: Get ALL manufacturer orders for this manufacturer (no filters)
    const allOrders = await prisma.manufacturerOrder.findMany({
      where: {
        manufacturerId: manufacturer.id,
      },
      select: {
        id: true,
        retailerId: true,
        productId: true,
        quantity: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
        paystackReference: true,
        paidAt: true,
        shippingAddress: true,
        trackingNumber: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📦 [VERIFY] Total manufacturer orders found: ${allOrders.length}`);
    console.log('');

    if (allOrders.length === 0) {
      console.log('⚠️ [VERIFY] No manufacturer orders exist for this manufacturer');
      console.log('   This could mean:');
      console.log('   1. No orders have been created yet');
      console.log('   2. Orders were created with a different manufacturerId');
      return;
    }

    // Step 3: Analyze each order
    console.log('📊 [VERIFY] Order Analysis:');
    console.log('='.repeat(80));

    let ordersWithShippingAddress = 0;
    let ordersPaid = 0;
    let ordersWithPackageInfo = 0;
    let ordersMatchingQuery = 0;

    for (let i = 0; i < allOrders.length; i++) {
      const order = allOrders[i];
      const shippingAddress = order.shippingAddress as any;

      console.log(`\n📦 Order ${i + 1}: ${order.id}`);
      console.log('   Status:', order.status);
      console.log('   Payment Status:', order.paymentStatus || 'null');
      console.log('   Paystack Reference:', order.paystackReference || 'null');
      console.log('   Paid At:', order.paidAt ? new Date(order.paidAt).toISOString() : 'null');
      console.log('   Tracking Number:', order.trackingNumber || 'null');
      console.log('   Has ShippingAddress:', !!shippingAddress);
      
      if (shippingAddress) {
        ordersWithShippingAddress++;
        console.log('   ShippingAddress content:', JSON.stringify(shippingAddress, null, 2));
        console.log('   PackageId:', shippingAddress?.packageId || 'null');
        console.log('   ReceiptNo:', shippingAddress?.receiptNo || 'null');
        console.log('   TrackingLink:', shippingAddress?.trackingLink || 'null');
        console.log('   State:', shippingAddress?.state || 'null');
        console.log('   Status:', shippingAddress?.status || 'null');
        
        if (shippingAddress?.packageId || shippingAddress?.receiptNo) {
          ordersWithPackageInfo++;
        }
      }

      if (order.paymentStatus === 'paid') {
        ordersPaid++;
      }

      // Check if order matches the query conditions
      const matchesQuery = 
        (shippingAddress !== null) || 
        (order.paymentStatus === 'paid');
      
      if (matchesQuery) {
        ordersMatchingQuery++;
      }

      // Check if order would be included in packages
      const wouldBeIncluded = 
        order.paymentStatus === 'paid' || 
        shippingAddress?.packageId || 
        shippingAddress?.receiptNo || 
        order.trackingNumber;

      console.log('   Matches Query (shippingAddress OR paid):', matchesQuery);
      console.log('   Would Be Included in Packages:', wouldBeIncluded);
    }

    console.log('\n' + '='.repeat(80));
    console.log('📈 [VERIFY] Summary Statistics:');
    console.log('='.repeat(80));
    console.log(`Total Orders: ${allOrders.length}`);
    console.log(`Orders with ShippingAddress: ${ordersWithShippingAddress}`);
    console.log(`Orders Paid: ${ordersPaid}`);
    console.log(`Orders with Package Info (packageId/receiptNo): ${ordersWithPackageInfo}`);
    console.log(`Orders Matching Query: ${ordersMatchingQuery}`);

    // Step 4: Test the actual query used in the endpoint
    console.log('\n' + '='.repeat(80));
    console.log('🔍 [VERIFY] Testing Actual Endpoint Query:');
    console.log('='.repeat(80));

    const endpointOrders = await prisma.manufacturerOrder.findMany({
      where: {
        manufacturerId: manufacturer.id,
        OR: [
          {
            shippingAddress: {
              not: null,
            },
          },
          {
            paymentStatus: 'paid',
          },
        ],
      },
      include: {
        retailer: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
            phone: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Orders returned by endpoint query: ${endpointOrders.length}`);

    // Step 5: Check which orders would be included in packages
    const packages = [];
    for (const order of endpointOrders) {
      const shippingAddress = order.shippingAddress as any;
      
      const wouldInclude = 
        order.paymentStatus === 'paid' || 
        shippingAddress?.packageId || 
        shippingAddress?.receiptNo || 
        order.trackingNumber;

      if (wouldInclude) {
        packages.push({
          orderId: order.id,
          paymentStatus: order.paymentStatus,
          hasPackageId: !!shippingAddress?.packageId,
          hasReceiptNo: !!shippingAddress?.receiptNo,
          hasTrackingNumber: !!order.trackingNumber,
        });
      }
    }

    console.log(`Packages that would be returned: ${packages.length}`);
    
    if (packages.length > 0) {
      console.log('\nPackages breakdown:');
      packages.forEach((pkg, idx) => {
        console.log(`  ${idx + 1}. Order ${pkg.orderId}:`);
        console.log(`     Payment Status: ${pkg.paymentStatus}`);
        console.log(`     Has PackageId: ${pkg.hasPackageId}`);
        console.log(`     Has ReceiptNo: ${pkg.hasReceiptNo}`);
        console.log(`     Has TrackingNumber: ${pkg.hasTrackingNumber}`);
      });
    }

    // Step 6: Recommendations
    console.log('\n' + '='.repeat(80));
    console.log('💡 [VERIFY] Recommendations:');
    console.log('='.repeat(80));

    if (allOrders.length === 0) {
      console.log('⚠️  No orders found. Create a test order first.');
    } else if (ordersPaid === 0) {
      console.log('⚠️  No paid orders found. Orders need to be paid to show up.');
      console.log('   Make sure orders have paymentStatus = "paid"');
    } else if (ordersMatchingQuery === 0) {
      console.log('⚠️  Orders exist but don\'t match query conditions.');
      console.log('   Check that orders have either:');
      console.log('   1. shippingAddress set (not null)');
      console.log('   2. paymentStatus = "paid"');
    } else if (packages.length === 0) {
      console.log('⚠️  Orders match query but don\'t have package info.');
      console.log('   Orders need:');
      console.log('   - paymentStatus = "paid" OR');
      console.log('   - shippingAddress.packageId OR');
      console.log('   - shippingAddress.receiptNo OR');
      console.log('   - trackingNumber');
    } else {
      console.log('✅ Orders should be showing up!');
      console.log('   If they\'re not, check:');
      console.log('   1. Frontend API call is correct');
      console.log('   2. Authentication is working');
      console.log('   3. Response is being parsed correctly');
    }

  } catch (error) {
    console.error('❌ [VERIFY] Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyManufacturerPackages()
  .then(() => {
    console.log('\n✅ [VERIFY] Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ [VERIFY] Verification failed:', error);
    process.exit(1);
  });

