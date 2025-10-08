import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickCheck() {
  try {
    console.log('🔍 Quick check of recent payments...\n');
    
    // Get the most recent order
    const latestOrder = await prisma.order.findFirst({
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
        },
        escrows: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (latestOrder) {
      console.log('📋 Latest Service Order:');
      console.log(`  ID: ${latestOrder.id}`);
      console.log(`  Status: ${latestOrder.status}`);
      console.log(`  Total: ${latestOrder.totalAmount}`);
      console.log(`  Created: ${latestOrder.createdAt}`);
      console.log(`  Paystack Ref: ${latestOrder.paystackReference || 'N/A'}`);
      console.log(`  Service Appointments: ${latestOrder.serviceAppointments.length}`);
      console.log(`  Escrows: ${latestOrder.escrows.length}`);
      
      if (latestOrder.escrows.length > 0) {
        latestOrder.escrows.forEach((escrow, i) => {
          console.log(`    Escrow ${i + 1}: ${escrow.amount} ${escrow.currency} (${escrow.status})`);
        });
      } else {
        console.log('  ❌ No escrows found for this order');
      }
    } else {
      console.log('❌ No service orders found');
    }

    // Check total escrow count
    const escrowCount = await prisma.serviceEscrow.count();
    console.log(`\n📊 Total escrows in database: ${escrowCount}`);

    // Check escrow stats
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

quickCheck();




