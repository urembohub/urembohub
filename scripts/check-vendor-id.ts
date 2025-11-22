import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVendorId() {
  try {
    const serviceId = '56ae2111-851a-417d-bebc-16b856355487';
    
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, name: true, vendorId: true },
    });
    
    console.log('📦 Service:', service);
    
    if (service) {
      // Check if this vendor has any slots
      const vendorSlots = await prisma.vendorScheduleSlot.findMany({
        where: { vendorId: service.vendorId },
        take: 5,
      });
      
      console.log(`\n📅 Slots for service vendor (${service.vendorId}): ${vendorSlots.length}`);
      
      // Check for Wednesday slots
      const wednesdaySlots = await prisma.vendorScheduleSlot.findMany({
        where: {
          vendorId: service.vendorId,
          slotDate: new Date('2025-11-12'),
        },
      });
      
      console.log(`📅 Wednesday (2025-11-12) slots: ${wednesdaySlots.length}`);
      if (wednesdaySlots.length > 0) {
        wednesdaySlots.slice(0, 5).forEach(slot => {
          const timeStr = slot.slotTime instanceof Date
            ? `${slot.slotTime.getUTCHours().toString().padStart(2, '0')}:${slot.slotTime.getUTCMinutes().toString().padStart(2, '0')}`
            : slot.slotTime;
          console.log(`  - Time: ${timeStr}, Blocked: ${slot.isBlocked}`);
        });
      }
      
      // Check which vendors have slots on Wednesday
      const allWednesdaySlots = await prisma.vendorScheduleSlot.findMany({
        where: {
          slotDate: new Date('2025-11-12'),
        },
        select: { vendorId: true },
        distinct: ['vendorId'],
      });
      
      console.log(`\n📅 Vendors with slots on Wednesday: ${allWednesdaySlots.length}`);
      allWednesdaySlots.forEach((slot, index) => {
        console.log(`  ${index + 1}. ${slot.vendorId}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVendorId();


