const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testEscrowStats() {
  try {
    console.log('🔍 Testing escrow stats calculation...\n');
    
    // Replicate the exact logic from EscrowService.getEscrowStats()
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('Today:', today);
    console.log('Tomorrow:', tomorrow);
    console.log('Current time:', new Date());
    
    const [
      totalEscrowAmount,
      pendingEscrows,
      completedEscrows,
      disputedEscrows,
      releasedToday,
      autoReleasePending,
    ] = await Promise.all([
      // Total escrow amount (pending + in_progress + completed)
      prisma.serviceEscrow.aggregate({
        where: {
          status: {
            in: ['pending', 'in_progress', 'completed'],
          },
        },
        _sum: {
          amount: true,
        },
      }),
      
      // Pending escrows count
      prisma.serviceEscrow.count({
        where: {
          status: 'pending',
        },
      }),
      
      // Completed escrows count
      prisma.serviceEscrow.count({
        where: {
          status: 'completed',
        },
      }),
      
      // Disputed escrows count
      prisma.serviceEscrow.count({
        where: {
          status: 'disputed',
        },
      }),
      
      // Released today count
      prisma.serviceEscrow.count({
        where: {
          status: 'released',
          releasedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      
      // Auto-release pending count (completed escrows with auto-release date in the past)
      prisma.serviceEscrow.count({
        where: {
          status: 'completed',
          autoReleaseDate: {
            lte: new Date(),
          },
        },
      }),
    ]);

    const result = {
      totalEscrowAmount: Number(totalEscrowAmount._sum.amount) || 0,
      pendingEscrows,
      completedEscrows,
      disputedEscrows,
      releasedToday,
      autoReleasePending,
    };

    console.log('\nEscrow Stats Result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Also check what the raw aggregate returns
    console.log('\nRaw totalEscrowAmount aggregate result:');
    console.log(JSON.stringify(totalEscrowAmount, null, 2));
    
    // Check individual status counts
    const statusCounts = await prisma.serviceEscrow.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });
    
    console.log('\nStatus counts:');
    statusCounts.forEach(group => {
      console.log(`  ${group.status}: ${group._count.status}`);
    });
    
  } catch (error) {
    console.error('Error testing escrow stats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEscrowStats();




