import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorScheduleService {
  constructor(private prisma: PrismaService) {}

  async getScheduleSlots(vendorId: string) {
    try {
      console.log('📤 [BACKEND] getScheduleSlots called for vendor:', vendorId);
      
      const slots = await this.prisma.vendorScheduleSlot.findMany({
        where: {
          vendorId: vendorId,
        },
        orderBy: [
          { slotDate: 'asc' },
          { slotTime: 'asc' },
        ],
      });
      
      console.log('📤 [BACKEND] Returning schedule slots:', {
        vendorId,
        totalSlots: slots.length,
        sampleSlots: slots.slice(0, 3).map(s => ({
          id: s.id,
          slotDate: s.slotDate,
          slotTime: s.slotTime,
          isBlocked: s.isBlocked,
        })),
      });
      
      // Return slots as plain objects to avoid serialization issues
      // slotDate is a DATE field, slotTime is a TIME field
      return slots.map(slot => {
        // Format slotDate (DATE field) as YYYY-MM-DD string
        let slotDateStr: string;
        if (slot.slotDate instanceof Date) {
          const year = slot.slotDate.getUTCFullYear();
          const month = String(slot.slotDate.getUTCMonth() + 1).padStart(2, '0');
          const day = String(slot.slotDate.getUTCDate()).padStart(2, '0');
          slotDateStr = `${year}-${month}-${day}`;
        } else {
          slotDateStr = slot.slotDate as string;
        }

        // Format slotTime (TIME field) as HH:MM string
        let slotTimeStr: string;
        if (slot.slotTime instanceof Date) {
          const hours = String(slot.slotTime.getUTCHours()).padStart(2, '0');
          const minutes = String(slot.slotTime.getUTCMinutes()).padStart(2, '0');
          slotTimeStr = `${hours}:${minutes}`;
        } else {
          slotTimeStr = slot.slotTime as string;
        }

        return {
          id: slot.id,
          vendorId: slot.vendorId,
          slotDate: slotDateStr,
          slotTime: slotTimeStr,
          isBlocked: slot.isBlocked,
          appointmentId: slot.appointmentId,
          createdAt: slot.createdAt instanceof Date ? slot.createdAt.toISOString() : slot.createdAt,
          updatedAt: slot.updatedAt instanceof Date ? slot.updatedAt.toISOString() : slot.updatedAt,
        };
      });
    } catch (error) {
      console.error('❌ [BACKEND] Error in getScheduleSlots:', error);
      throw error;
    }
  }

  async toggleSlotAvailability(
    vendorId: string,
    slotDate: string,
    slotTime: string,
    isBlocked: boolean
  ) {
    // Parse the date string (yyyy-MM-dd) - use UTC to avoid timezone issues
    // Create date at noon UTC to avoid timezone shifts when converting to DATE field
    const [year, month, day] = slotDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // Use UTC and noon to avoid date shifts
    
    console.log('📅 [BACKEND] Parsed slot date:', {
      inputDateString: slotDate,
      year,
      month,
      day,
      parsedDate: date,
      dateISO: date.toISOString(),
      dateUTCDate: date.getUTCDate(),
    });
    
    // Parse time string (HH:mm format) and create a time object
    // Use UTC to avoid timezone shifts - the time should be stored as-is
    const [hours, minutes] = slotTime.split(':').map(Number);
    const timeDate = new Date('1970-01-01T00:00:00.000Z'); // Use UTC date
    timeDate.setUTCHours(hours, minutes, 0, 0); // Use UTC methods to avoid timezone conversion

    console.log('🕐 [BACKEND] Parsed slot time:', {
      inputTimeString: slotTime,
      hours,
      minutes,
      timeDateISO: timeDate.toISOString(),
      timeDateUTCHours: timeDate.getUTCHours(),
      timeDateUTCMinutes: timeDate.getUTCMinutes(),
      timeDateLocalHours: timeDate.getHours(),
      timeDateLocalMinutes: timeDate.getMinutes(),
    });

    // Find existing slot first
    const existing = await this.prisma.vendorScheduleSlot.findFirst({
      where: {
        vendorId: vendorId,
        slotDate: date,
        slotTime: timeDate,
      },
    });

    if (existing) {
      return this.prisma.vendorScheduleSlot.update({
        where: { id: existing.id },
        data: { isBlocked: isBlocked },
      });
    } else {
      return this.prisma.vendorScheduleSlot.create({
        data: {
          vendorId: vendorId,
          slotDate: date,
          slotTime: timeDate,
          isBlocked: isBlocked,
        },
      });
    }
  }

  async toggleDayAvailability(
    vendorId: string,
    slotDate: string,
    isBlocked: boolean
  ) {
    console.log('📅 [BACKEND] toggleDayAvailability called:', {
      vendorId,
      slotDate,
      isBlocked,
      receivedDateString: slotDate,
    });

    // Block/unblock all time slots for the day
    // Generate 30-minute intervals from 9 AM to 6 PM to match frontend
    const timeSlots: string[] = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break; // Stop at 6:00 PM
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        timeSlots.push(time);
      }
    }
    // Parse the date string (yyyy-MM-dd) - use UTC to avoid timezone issues
    // Create date at noon UTC to avoid timezone shifts when converting to DATE field
    const [year, month, day] = slotDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // Use UTC and noon to avoid date shifts

    console.log('📅 [BACKEND] Parsed date:', {
      inputDateString: slotDate,
      year,
      month,
      day,
      parsedDate: date,
      dateISO: date.toISOString(),
      dateUTCString: date.toUTCString(),
      dateLocalString: date.toLocaleString(),
      dateUTCFullYear: date.getUTCFullYear(),
      dateUTCMonth: date.getUTCMonth() + 1,
      dateUTCDate: date.getUTCDate(),
      dateLocalFullYear: date.getFullYear(),
      dateLocalMonth: date.getMonth() + 1,
      dateLocalDate: date.getDate(),
    });

    const promises = timeSlots.map(async (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      const timeDate = new Date('1970-01-01T00:00:00.000Z'); // Use UTC date
      timeDate.setUTCHours(hours, minutes, 0, 0); // Use UTC methods to avoid timezone conversion

      // Find existing slot first
      const existing = await this.prisma.vendorScheduleSlot.findFirst({
        where: {
          vendorId: vendorId,
          slotDate: date,
          slotTime: timeDate,
        },
      });

      if (existing) {
        console.log(`🔄 [BACKEND] Updating existing slot:`, {
          slotId: existing.id,
          time,
          date: date.toISOString().split('T')[0],
          isBlocked,
        });
        const updated = await this.prisma.vendorScheduleSlot.update({
          where: { id: existing.id },
          data: { isBlocked: isBlocked },
        });
        console.log(`✅ [BACKEND] Updated slot:`, {
          slotId: updated.id,
          slotDate: updated.slotDate,
          slotTime: updated.slotTime,
          isBlocked: updated.isBlocked,
        });
        return updated;
      } else {
        console.log(`➕ [BACKEND] Creating new slot:`, {
          time,
          date: date.toISOString().split('T')[0],
          isBlocked,
        });
        const created = await this.prisma.vendorScheduleSlot.create({
          data: {
            vendorId: vendorId,
            slotDate: date,
            slotTime: timeDate,
            isBlocked: isBlocked,
          },
        });
        console.log(`✅ [BACKEND] Created slot:`, {
          slotId: created.id,
          slotDate: created.slotDate,
          slotTime: created.slotTime,
          isBlocked: created.isBlocked,
        });
        return created;
      }
    });

    await Promise.all(promises);
    
    // Log what was actually saved
    const savedSlots = await this.prisma.vendorScheduleSlot.findMany({
      where: {
        vendorId: vendorId,
        slotDate: date,
      },
      orderBy: { slotTime: 'asc' },
    });
    
    console.log('💾 [BACKEND] Slots saved to database for date:', {
      dateString: slotDate,
      parsedDate: date.toISOString().split('T')[0],
      totalSlots: savedSlots.length,
      blockedSlots: savedSlots.filter(s => s.isBlocked).length,
      slots: savedSlots.map(s => ({
        id: s.id,
        slotDate: s.slotDate,
        slotTime: s.slotTime,
        isBlocked: s.isBlocked,
      })),
    });
    
    return { success: true, message: `Day ${isBlocked ? 'blocked' : 'opened'} successfully` };
  }

  async toggleMultipleDaysAvailability(
    vendorId: string,
    dates: string[],
    isBlocked: boolean
  ) {
    // Generate 30-minute intervals from 9 AM to 6 PM to match frontend
    const timeSlots: string[] = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break; // Stop at 6:00 PM
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        timeSlots.push(time);
      }
    }

    const promises = dates.flatMap((slotDate) => {
      // Parse the date string (yyyy-MM-dd) - use UTC to avoid timezone issues
      // Create date at noon UTC to avoid timezone shifts when converting to DATE field
      const [year, month, day] = slotDate.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // Use UTC and noon to avoid date shifts
      return timeSlots.map(async (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        const timeDate = new Date('1970-01-01T00:00:00.000Z'); // Use UTC date
        timeDate.setUTCHours(hours, minutes, 0, 0); // Use UTC methods to avoid timezone conversion

        // Find existing slot first
        const existing = await this.prisma.vendorScheduleSlot.findFirst({
          where: {
            vendorId: vendorId,
            slotDate: date,
            slotTime: timeDate,
          },
        });

        if (existing) {
          return this.prisma.vendorScheduleSlot.update({
            where: { id: existing.id },
            data: { isBlocked: isBlocked },
          });
        } else {
          return this.prisma.vendorScheduleSlot.create({
            data: {
              vendorId: vendorId,
              slotDate: date,
              slotTime: timeDate,
              isBlocked: isBlocked,
            },
          });
        }
      });
    });

    await Promise.all(promises);
    return { success: true, message: `${dates.length} day${dates.length > 1 ? 's' : ''} ${isBlocked ? 'blocked' : 'opened'} successfully` };
  }
}

