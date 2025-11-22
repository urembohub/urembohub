import { PrismaClient, EscrowStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function testVendorEscrow() {
  console.log('🔍 Testing Vendor Escrow Data...\n');

  try {
    // Step 1: Get all vendors
    console.log('📋 Step 1: Fetching all vendors...');
    const vendors = await prisma.profile.findMany({
      where: {
        role: 'vendor',
      },
      take: 5,
      select: {
        id: true,
        email: true,
        fullName: true,
        businessName: true,
      },
    });

    console.log(`Found ${vendors.length} vendors`);
    if (vendors.length === 0) {
      console.log('❌ No vendors found in database');
      return;
    }

    vendors.forEach((vendor, index) => {
      console.log(`  ${index + 1}. ${vendor.businessName || vendor.fullName || vendor.email} (${vendor.id})`);
    });

    // Find vendor with escrows, or use first vendor
    let testVendorId = vendors[0].id;
    let testVendor = vendors[0];
    
    // Check which vendors have escrows
    const escrowCounts = await Promise.all(
      vendors.map(v => 
        prisma.serviceEscrow.count({ where: { vendorId: v.id } })
          .then(count => ({ vendor: v, count }))
      )
    );
    
    const vendorWithEscrows = escrowCounts.find(v => v.count > 0);
    if (vendorWithEscrows) {
      testVendorId = vendorWithEscrows.vendor.id;
      testVendor = vendorWithEscrows.vendor;
      console.log(`\n🎯 Testing with vendor that has escrows: ${testVendor.businessName || testVendor.fullName || testVendor.email} (${vendorWithEscrows.count} escrows)\n`);
    } else {
      console.log(`\n🎯 Testing with vendor: ${testVendor.businessName || testVendor.fullName || testVendor.email}\n`);
    }

    // Step 2: Check total escrows for this vendor
    console.log('📊 Step 2: Checking escrow data...');
    const totalEscrows = await prisma.serviceEscrow.count({
      where: {
        vendorId: testVendorId,
      },
    });

    console.log(`Total escrows for vendor: ${totalEscrows}`);

    if (totalEscrows === 0) {
      console.log('\n⚠️  No escrows found for this vendor');
      console.log('   This explains why the payments page is blank.\n');

      // Check if there are any escrows at all
      const allEscrows = await prisma.serviceEscrow.count();
      console.log(`Total escrows in database: ${allEscrows}`);

      if (allEscrows > 0) {
        console.log('\n📋 Checking escrows for other vendors...');
        const escrowsByVendor = await prisma.serviceEscrow.groupBy({
          by: ['vendorId'],
          _count: {
            id: true,
          },
        });

        console.log('Escrows by vendor:');
        for (const group of escrowsByVendor) {
          const vendor = await prisma.profile.findUnique({
            where: { id: group.vendorId },
            select: { email: true, fullName: true, businessName: true },
          });
          console.log(`  - ${vendor?.businessName || vendor?.fullName || vendor?.email || group.vendorId}: ${group._count.id} escrows`);
        }
      }

      // Check if there are orders with service appointments
      console.log('\n📦 Checking for orders with service appointments...');
      const ordersWithServices = await prisma.order.findMany({
        where: {
          serviceAppointments: {
            some: {},
          },
        },
        include: {
          serviceAppointments: {
            include: {
              service: {
                include: {
                  vendor: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      businessName: true,
                    },
                  },
                },
              },
            },
          },
        },
        take: 5,
      });

      console.log(`Found ${ordersWithServices.length} orders with service appointments`);
      if (ordersWithServices.length > 0) {
        console.log('\nSample orders with service appointments:');
        ordersWithServices.forEach((order, index) => {
          console.log(`\n  Order ${index + 1}:`);
          console.log(`    Order ID: ${order.id}`);
          console.log(`    Status: ${order.status}`);
          console.log(`    Payment Status: ${order.paymentStatus}`);
          console.log(`    Service Appointments: ${order.serviceAppointments.length}`);
          order.serviceAppointments.forEach((appointment, idx) => {
            console.log(`      ${idx + 1}. ${appointment.service?.name || 'N/A'}`);
            console.log(`         Vendor: ${appointment.service?.vendor?.businessName || appointment.service?.vendor?.fullName || appointment.service?.vendor?.email || 'N/A'}`);
            console.log(`         Price: ${appointment.servicePrice}`);
            console.log(`         Status: ${appointment.status}`);
          });
        });

        // Check if escrows should have been created
        const paidOrders = ordersWithServices.filter(
          o => o.paymentStatus === 'paid' || o.paymentStatus === 'processing' || o.status === 'paid' || o.status === 'confirmed'
        );
        console.log(`\n💰 Orders with paid/processing status: ${paidOrders.length}`);
        if (paidOrders.length > 0) {
          console.log('   ⚠️  These orders should have escrows created but don\'t!');
        }
      }

      return;
    }

    // Step 3: Get escrows by status
    console.log('\n📈 Step 3: Escrows by status...');
    const statusCounts = await Promise.all([
      prisma.serviceEscrow.count({ where: { vendorId: testVendorId, status: EscrowStatus.pending } }),
      prisma.serviceEscrow.count({ where: { vendorId: testVendorId, status: EscrowStatus.in_progress } }),
      prisma.serviceEscrow.count({ where: { vendorId: testVendorId, status: EscrowStatus.completed } }),
      prisma.serviceEscrow.count({ where: { vendorId: testVendorId, status: EscrowStatus.released } }),
      prisma.serviceEscrow.count({ where: { vendorId: testVendorId, status: EscrowStatus.disputed } }),
    ]);

    console.log(`  Pending: ${statusCounts[0]}`);
    console.log(`  In Progress: ${statusCounts[1]}`);
    console.log(`  Completed: ${statusCounts[2]}`);
    console.log(`  Released: ${statusCounts[3]}`);
    console.log(`  Disputed: ${statusCounts[4]}`);

    // Step 4: Calculate stats (same as backend method)
    console.log('\n💰 Step 4: Calculating vendor escrow stats...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalEscrowBalance,
      pendingEscrows,
      inProgressEscrows,
      completedEscrows,
      releasedEscrows,
      disputedEscrows,
      releasedToday,
      totalReleased,
      totalPending,
    ] = await Promise.all([
      prisma.serviceEscrow.aggregate({
        where: {
          vendorId: testVendorId,
          status: {
            in: [EscrowStatus.pending, EscrowStatus.in_progress, EscrowStatus.completed],
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.serviceEscrow.count({
        where: {
          vendorId: testVendorId,
          status: EscrowStatus.pending,
        },
      }),
      prisma.serviceEscrow.count({
        where: {
          vendorId: testVendorId,
          status: EscrowStatus.in_progress,
        },
      }),
      prisma.serviceEscrow.count({
        where: {
          vendorId: testVendorId,
          status: EscrowStatus.completed,
        },
      }),
      prisma.serviceEscrow.count({
        where: {
          vendorId: testVendorId,
          status: EscrowStatus.released,
        },
      }),
      prisma.serviceEscrow.count({
        where: {
          vendorId: testVendorId,
          status: EscrowStatus.disputed,
        },
      }),
      prisma.serviceEscrow.aggregate({
        where: {
          vendorId: testVendorId,
          status: EscrowStatus.released,
          releasedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.serviceEscrow.aggregate({
        where: {
          vendorId: testVendorId,
          status: EscrowStatus.released,
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.serviceEscrow.aggregate({
        where: {
          vendorId: testVendorId,
          status: EscrowStatus.pending,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const stats = {
      totalEscrowBalance: Number(totalEscrowBalance._sum.amount) || 0,
      pendingEscrows,
      inProgressEscrows,
      completedEscrows,
      releasedEscrows,
      disputedEscrows,
      releasedToday: Number(releasedToday._sum.amount) || 0,
      totalReleased: Number(totalReleased._sum.amount) || 0,
      totalPending: Number(totalPending._sum.amount) || 0,
    };

    console.log('\n📊 Vendor Escrow Stats:');
    console.log(JSON.stringify(stats, null, 2));

    // Step 5: Get sample escrows
    console.log('\n📋 Step 5: Sample escrows...');
    const sampleEscrows = await prisma.serviceEscrow.findMany({
      where: {
        vendorId: testVendorId,
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
        order: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    console.log(`\nShowing ${sampleEscrows.length} sample escrows:\n`);
    sampleEscrows.forEach((escrow, index) => {
      console.log(`Escrow ${index + 1}:`);
      console.log(`  ID: ${escrow.id}`);
      console.log(`  Service: ${escrow.service?.name || 'N/A'}`);
      console.log(`  Customer: ${escrow.customer?.fullName || escrow.customer?.businessName || escrow.customer?.email || 'Guest'}`);
      console.log(`  Amount: ${escrow.amount} ${escrow.currency}`);
      console.log(`  Status: ${escrow.status}`);
      console.log(`  Created: ${escrow.createdAt.toISOString()}`);
      console.log(`  Auto Release: ${escrow.autoReleaseDate.toISOString()}`);
      console.log(`  Order Status: ${escrow.order?.status || 'N/A'}`);
      console.log(`  Payment Status: ${escrow.order?.paymentStatus || 'N/A'}`);
      console.log('');
    });

    // Step 6: Test the actual service method
    console.log('✅ Step 6: All data checks completed successfully!');
    console.log('\n💡 If the frontend is showing blank, check:');
    console.log('   1. Is the vendor ID correct?');
    console.log('   2. Are there escrows for this vendor?');
    console.log('   3. Is the API endpoint returning data?');
    console.log('   4. Check browser console for errors');

  } catch (error) {
    console.error('❌ Error testing vendor escrow:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testVendorEscrow()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

