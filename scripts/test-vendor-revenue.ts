import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testVendorRevenue() {
  console.log('🔍 Testing Vendor Revenue Calculation');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Step 1: Find all vendors
    console.log('📋 Step 1: Finding vendors...');
    const vendors = await prisma.profile.findMany({
      where: { role: 'vendor' },
      select: {
        id: true,
        email: true,
        fullName: true,
        businessName: true,
      },
      take: 5, // Limit to first 5 vendors
    });

    console.log(`Found ${vendors.length} vendors\n`);

    if (vendors.length === 0) {
      console.log('❌ No vendors found in database');
      return;
    }

    // Test each vendor
    for (const vendor of vendors) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 Testing Vendor: ${vendor.email} (${vendor.fullName})`);
      console.log(`   Vendor ID: ${vendor.id}`);
      console.log(`${'='.repeat(60)}\n`);

      // Step 2: Get all service appointments for this vendor
      console.log('📊 Step 2: Fetching service appointments...');
      const allAppointments = await prisma.serviceAppointment.findMany({
        where: { vendorId: vendor.id },
        include: {
          order: {
            select: {
              id: true,
              status: true,
              paymentStatus: true,
              paymentReference: true,
              totalAmount: true,
              createdAt: true,
              clientId: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      });

      console.log(`   Total service appointments: ${allAppointments.length}\n`);

      if (allAppointments.length === 0) {
        console.log('   ⚠️  No service appointments found for this vendor\n');
        continue;
      }

      // Step 3: Analyze appointments by status
      console.log('📈 Step 3: Analyzing appointments by status...');
      const statusCounts = allAppointments.reduce((acc, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('   Status breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`     ${status}: ${count}`);
      });
      console.log('');

      // Step 4: Analyze payment status
      console.log('💳 Step 4: Analyzing payment status...');
      const paymentStatusCounts = allAppointments.reduce((acc, apt) => {
        const paymentStatus = apt.order?.paymentStatus || 'unknown';
        acc[paymentStatus] = (acc[paymentStatus] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('   Payment status breakdown:');
      Object.entries(paymentStatusCounts).forEach(([status, count]) => {
        console.log(`     ${status}: ${count}`);
      });
      console.log('');

      // Step 5: Check order status
      console.log('📦 Step 5: Analyzing order status...');
      const orderStatusCounts = allAppointments.reduce((acc, apt) => {
        const orderStatus = apt.order?.status || 'unknown';
        acc[orderStatus] = (acc[orderStatus] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('   Order status breakdown:');
      Object.entries(orderStatusCounts).forEach(([status, count]) => {
        console.log(`     ${status}: ${count}`);
      });
      console.log('');

      // Step 6: Check payment references
      console.log('🔗 Step 6: Checking payment references...');
      const withPaymentRef = allAppointments.filter(
        (apt) => apt.order?.paymentReference !== null
      ).length;
      const withoutPaymentRef = allAppointments.length - withPaymentRef;

      console.log(`   With payment reference: ${withPaymentRef}`);
      console.log(`   Without payment reference: ${withoutPaymentRef}`);
      console.log('');

      // Step 7: Apply the same filters as the dashboard (updated)
      console.log('✅ Step 7: Applying dashboard filters...');
      const filteredAppointments = allAppointments.filter((apt) => {
        // Filter 1: Status not cancelled or rejected
        if (['cancelled', 'rejected'].includes(apt.status)) {
          return false;
        }

        // Filter 2: Order status not cancelled
        if (apt.order?.status === 'cancelled') {
          return false;
        }

        // Filter 3: Payment status is paid, completed, or processing
        // OR order status is paid or confirmed (indicates payment)
        const paymentStatus = apt.order?.paymentStatus || '';
        const orderStatus = apt.order?.status || '';
        
        const hasValidPaymentStatus = ['paid', 'completed', 'processing'].includes(paymentStatus);
        const hasValidOrderStatus = ['paid', 'confirmed'].includes(orderStatus);
        
        if (!hasValidPaymentStatus && !hasValidOrderStatus) {
          return false;
        }

        return true;
      });

      console.log(`   Appointments passing all filters: ${filteredAppointments.length}`);
      console.log('');

      // Step 8: Calculate revenue
      console.log('💰 Step 8: Calculating revenue...');
      const totalRevenue = filteredAppointments.reduce(
        (sum, apt) => sum + Number(apt.servicePrice || 0),
        0
      );

      console.log(`   Total Revenue: ${totalRevenue.toFixed(2)}`);
      console.log('');

      // Step 9: Show sample appointments that pass filters
      if (filteredAppointments.length > 0) {
        console.log('📋 Step 9: Sample appointments (first 3 that pass filters):');
        filteredAppointments.slice(0, 3).forEach((apt, idx) => {
          console.log(`\n   Appointment ${idx + 1}:`);
          console.log(`     ID: ${apt.id}`);
          console.log(`     Service: ${apt.service?.name || 'N/A'}`);
          console.log(`     Price: ${apt.servicePrice}`);
          console.log(`     Status: ${apt.status}`);
          console.log(`     Order Status: ${apt.order?.status}`);
          console.log(`     Payment Status: ${apt.order?.paymentStatus}`);
          console.log(`     Payment Reference: ${apt.order?.paymentReference || 'None'}`);
          console.log(`     Created: ${apt.createdAt}`);
        });
      } else {
        console.log('❌ Step 9: No appointments pass all filters!');
        console.log('\n   Showing why appointments are being filtered out:');
        
        // Show why each appointment is filtered
        allAppointments.slice(0, 5).forEach((apt, idx) => {
          console.log(`\n   Appointment ${idx + 1} (ID: ${apt.id}):`);
          const reasons: string[] = [];
          
          if (['cancelled', 'rejected'].includes(apt.status)) {
            reasons.push(`❌ Status is ${apt.status}`);
          }
          
          if (!['paid', 'completed'].includes(apt.order?.paymentStatus || '')) {
            reasons.push(`❌ Payment status is ${apt.order?.paymentStatus || 'null'} (needs 'paid' or 'completed')`);
          }
          
          if (apt.order?.status === 'cancelled') {
            reasons.push(`❌ Order status is cancelled`);
          }
          
          if (!apt.order?.paymentReference) {
            reasons.push(`❌ No payment reference`);
          }
          
          if (reasons.length === 0) {
            console.log(`     ✅ Should pass filters!`);
          } else {
            reasons.forEach(reason => console.log(`     ${reason}`));
          }
        });
      }

      // Step 10: Test the actual dashboard query (updated filter)
      console.log('\n🔬 Step 10: Testing dashboard query directly...');
      const dashboardRevenue = await prisma.serviceAppointment.aggregate({
        where: {
          vendorId: vendor.id,
          status: { notIn: ['cancelled', 'rejected'] },
          order: {
            AND: [
              { status: { not: 'cancelled' } },
              {
                OR: [
                  { paymentStatus: { in: ['paid', 'completed', 'processing'] } },
                  { status: { in: ['paid', 'confirmed'] } },
                ],
              },
            ],
          },
        },
        _sum: { servicePrice: true },
      });

      console.log(`   Dashboard query result: ${Number(dashboardRevenue._sum.servicePrice || 0).toFixed(2)}`);
      console.log('');

      // Step 11: Check what payment statuses actually exist
      console.log('🔍 Step 11: Checking actual payment status values...');
      const uniquePaymentStatuses = new Set(
        allAppointments.map((apt) => apt.order?.paymentStatus).filter(Boolean)
      );
      console.log(`   Unique payment statuses found: ${Array.from(uniquePaymentStatuses).join(', ')}`);
      console.log('');

      // Step 12: Check if there are any paid orders at all
      console.log('🔍 Step 12: Checking for any paid orders...');
      const paidOrders = await prisma.order.findMany({
        where: {
          serviceAppointments: {
            some: {
              vendorId: vendor.id,
            },
          },
          paymentStatus: { in: ['paid', 'completed'] },
        },
        select: {
          id: true,
          paymentStatus: true,
          paymentReference: true,
          status: true,
        },
        take: 5,
      });

      console.log(`   Found ${paidOrders.length} paid orders with service appointments for this vendor`);
      if (paidOrders.length > 0) {
        console.log('   Sample paid orders:');
        paidOrders.forEach((order) => {
          console.log(`     Order ${order.id}:`);
          console.log(`       Payment Status: ${order.paymentStatus}`);
          console.log(`       Order Status: ${order.status}`);
          console.log(`       Payment Reference: ${order.paymentReference || 'None'}`);
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testVendorRevenue()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

