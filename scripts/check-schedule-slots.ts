import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkScheduleSlots() {
  try {
    const vendorId = '58c870c9-9aca-4366-8fc5-7b56d3e13406';
    
    console.log('🔍 Checking schedule slots for vendor:', vendorId);
    
    // Get all slots for this vendor
    const allSlots = await prisma.vendorScheduleSlot.findMany({
      where: {
        vendorId: vendorId,
      },
      orderBy: [
        { slotDate: 'asc' },
        { slotTime: 'asc' },
      ],
    });
    
    console.log(`\n📊 Total slots found: ${allSlots.length}`);
    
    if (allSlots.length > 0) {
      console.log('\n📅 Sample slots:');
      allSlots.slice(0, 10).forEach((slot, index) => {
        console.log(`${index + 1}. Date: ${slot.slotDate}, Time: ${slot.slotTime}, Blocked: ${slot.isBlocked}`);
      });
      
      // Check for Wednesday 2025-11-12 specifically
      const wednesdaySlots = allSlots.filter(slot => {
        const slotDate = slot.slotDate instanceof Date 
          ? slot.slotDate.toISOString().split('T')[0]
          : slot.slotDate;
        return slotDate === '2025-11-12';
      });
      
      console.log(`\n📅 Slots for Wednesday 2025-11-12: ${wednesdaySlots.length}`);
      if (wednesdaySlots.length > 0) {
        wednesdaySlots.forEach((slot, index) => {
          const timeStr = slot.slotTime instanceof Date
            ? `${slot.slotTime.getUTCHours().toString().padStart(2, '0')}:${slot.slotTime.getUTCMinutes().toString().padStart(2, '0')}`
            : slot.slotTime;
          console.log(`  ${index + 1}. Time: ${timeStr}, Blocked: ${slot.isBlocked}`);
        });
      }
      
      // Group by date
      const slotsByDate = allSlots.reduce((acc, slot) => {
        const dateStr = slot.slotDate instanceof Date 
          ? slot.slotDate.toISOString().split('T')[0]
          : slot.slotDate;
        if (!acc[dateStr]) {
          acc[dateStr] = { total: 0, blocked: 0 };
        }
        acc[dateStr].total++;
        if (slot.isBlocked) {
          acc[dateStr].blocked++;
        }
        return acc;
      }, {} as Record<string, { total: number; blocked: number }>);
      
      console.log('\n📅 Slots by date:');
      Object.entries(slotsByDate).forEach(([date, stats]) => {
        console.log(`  ${date}: ${stats.total} total, ${stats.blocked} blocked`);
      });
    } else {
      console.log('\n⚠️ No slots found for this vendor!');
      console.log('This could mean:');
      console.log('  1. The vendor hasn\'t blocked any slots yet');
      console.log('  2. The vendorId doesn\'t match');
      console.log('  3. The slots were deleted or not saved');
    }
    
    // Check all vendors to see if there are any slots at all
    const allVendorSlots = await prisma.vendorScheduleSlot.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
    
    console.log(`\n📊 Total slots in database (all vendors): ${await prisma.vendorScheduleSlot.count()}`);
    if (allVendorSlots.length > 0) {
      console.log('\n📅 Recent slots (all vendors):');
      allVendorSlots.forEach((slot, index) => {
        const dateStr = slot.slotDate instanceof Date 
          ? slot.slotDate.toISOString().split('T')[0]
          : slot.slotDate;
        const timeStr = slot.slotTime instanceof Date
          ? `${slot.slotTime.getUTCHours().toString().padStart(2, '0')}:${slot.slotTime.getUTCMinutes().toString().padStart(2, '0')}`
          : slot.slotTime;
        console.log(`  ${index + 1}. Vendor: ${slot.vendorId.substring(0, 8)}..., Date: ${dateStr}, Time: ${timeStr}, Blocked: ${slot.isBlocked}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking schedule slots:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkScheduleSlots();


