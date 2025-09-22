const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugEscrow() {
  try {
    console.log('🔍 Checking escrow records...\n');
    
    // Check total escrow records
    const totalEscrows = await prisma.serviceEscrow.count();
    console.log(`Total escrow records: ${totalEscrows}`);
    
    // Check escrow records by status
    const escrowsByStatus = await prisma.serviceEscrow.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });
    
    console.log('\nEscrows by status:');
    escrowsByStatus.forEach(group => {
      console.log(`  ${group.status}: ${group._count.status}`);
    });
    
    // Check total escrow amount
    const totalAmount = await prisma.serviceEscrow.aggregate({
      where: {
        status: {
          in: ['pending', 'in_progress', 'completed']
        }
      },
      _sum: {
        amount: true
      }
    });
    
    console.log(`\nTotal escrow amount (pending + in_progress + completed): ${totalAmount._sum.amount || 0}`);
    
    // Get some sample escrow records
    const sampleEscrows = await prisma.serviceEscrow.findMany({
      take: 5,
      include: {
        order: {
          select: {
            id: true,
            status: true,
            totalAmount: true
          }
        },
        service: {
          select: {
            name: true
          }
        },
        vendor: {
          select: {
            businessName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('\nSample escrow records:');
    sampleEscrows.forEach(escrow => {
      console.log(`  ID: ${escrow.id}`);
      console.log(`  Amount: ${escrow.amount}`);
      console.log(`  Status: ${escrow.status}`);
      console.log(`  Service: ${escrow.service?.name || 'N/A'}`);
      console.log(`  Vendor: ${escrow.vendor?.businessName || 'N/A'}`);
      console.log(`  Order ID: ${escrow.orderId}`);
      console.log(`  Created: ${escrow.createdAt}`);
      console.log('  ---');
    });
    
    // Check if there are any orders with service appointments
    const ordersWithServices = await prisma.order.findMany({
      where: {
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
        }
      },
      take: 3
    });
    
    console.log(`\nOrders with service appointments: ${ordersWithServices.length}`);
    ordersWithServices.forEach(order => {
      console.log(`  Order ID: ${order.id}`);
      console.log(`  Order Status: ${order.status}`);
      console.log(`  Service Appointments: ${order.serviceAppointments.length}`);
      order.serviceAppointments.forEach(appointment => {
        console.log(`    Service: ${appointment.service?.name || 'N/A'}`);
        console.log(`    Price: ${appointment.servicePrice}`);
        console.log(`    Vendor: ${appointment.service?.vendor?.businessName || 'N/A'}`);
      });
      console.log('  ---');
    });
    
  } catch (error) {
    console.error('Error debugging escrow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugEscrow();

