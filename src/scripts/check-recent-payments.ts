import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecentPayments() {
  try {
    console.log('🔍 Checking recent service payments and escrows...\n');
    
    // Get recent orders with service appointments
    const recentOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
        },
        serviceAppointments: {
          some: {}
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
        escrows: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    console.log('📋 Recent Service Orders:');
    recentOrders.forEach((order, index) => {
      console.log(`\nOrder ${index + 1}:`);
      console.log(`  ID: ${order.id}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Total: ${order.totalAmount}`);
      console.log(`  Created: ${order.createdAt}`);
      console.log(`  Paystack Ref: ${order.paystackReference || 'N/A'}`);
      console.log(`  Service Appointments: ${order.serviceAppointments.length}`);
      console.log(`  Escrows: ${order.escrows.length}`);
      
      if (order.escrows.length > 0) {
        order.escrows.forEach((escrow, i) => {
          console.log(`    Escrow ${i + 1}: ${escrow.amount} ${escrow.currency} (${escrow.status})`);
        });
      }
    });

    // Check all escrows
    console.log('\n🔒 All Escrows:');
    const allEscrows = await prisma.serviceEscrow.findMany({
      include: {
        service: true,
        vendor: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`Found ${allEscrows.length} escrows:`);
    allEscrows.forEach((escrow, index) => {
      console.log(`\nEscrow ${index + 1}:`);
      console.log(`  ID: ${escrow.id}`);
      console.log(`  Order ID: ${escrow.orderId}`);
      console.log(`  Service: ${escrow.service?.name || 'N/A'}`);
      console.log(`  Vendor: ${escrow.vendor?.fullName || 'N/A'}`);
      console.log(`  Amount: ${escrow.amount}`);
      console.log(`  Status: ${escrow.status}`);
      console.log(`  Created: ${escrow.createdAt}`);
    });

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

checkRecentPayments();

