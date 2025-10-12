import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugEscrowIssue() {
  try {
    console.log('🔍 Debugging escrow issue...\n');

    // Check recent orders
    console.log('📋 Recent Orders (last 24 hours):');
    const recentOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      include: {
        serviceAppointments: {
          include: {
            service: {
              include: {
                vendor: true
              }
            }
          }
        },
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    if (recentOrders.length === 0) {
      console.log('❌ No recent orders found');
    } else {
      recentOrders.forEach((order, index) => {
        console.log(`\nOrder ${index + 1}:`);
        console.log(`  ID: ${order.id}`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Total: ${order.totalAmount}`);
        console.log(`  Created: ${order.createdAt}`);
        console.log(`  User: ${order.user?.fullName || order.customerEmail || 'Guest'}`);
        console.log(`  Service Appointments: ${order.serviceAppointments.length}`);
        
        if (order.serviceAppointments.length > 0) {
          order.serviceAppointments.forEach((appointment, i) => {
            console.log(`    Service ${i + 1}:`);
            console.log(`      Service: ${appointment.service?.name || 'N/A'}`);
            console.log(`      Vendor: ${appointment.service?.vendor?.fullName || 'N/A'}`);
            console.log(`      Price: ${appointment.servicePrice}`);
            console.log(`      Currency: ${appointment.currency}`);
          });
        }
      });
    }

    // Check escrows
    console.log('\n🔒 All Escrows:');
    const escrows = await prisma.serviceEscrow.findMany({
      include: {
        service: true,
        vendor: true,
        customer: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (escrows.length === 0) {
      console.log('❌ No escrows found in database');
    } else {
      console.log(`✅ Found ${escrows.length} escrows:`);
      escrows.forEach((escrow, index) => {
        console.log(`\nEscrow ${index + 1}:`);
        console.log(`  ID: ${escrow.id}`);
        console.log(`  Order ID: ${escrow.orderId}`);
        console.log(`  Service: ${escrow.service?.name || 'N/A'}`);
        console.log(`  Vendor: ${escrow.vendor?.fullName || 'N/A'}`);
        console.log(`  Customer: ${escrow.customer?.fullName || 'N/A'}`);
        console.log(`  Amount: ${escrow.amount}`);
        console.log(`  Status: ${escrow.status}`);
        console.log(`  Created: ${escrow.createdAt}`);
        console.log(`  Paystack Ref: ${escrow.paystackReference || 'N/A'}`);
      });
    }

    // Check escrow stats
    console.log('\n📊 Escrow Stats:');
    const stats = await prisma.serviceEscrow.aggregate({
      where: {
        status: {
          in: ['pending', 'in_progress', 'completed']
        }
      },
      _sum: {
        amount: true
      }
    });

    console.log(`Total escrow amount: ${stats._sum.amount || 0}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugEscrowIssue();






