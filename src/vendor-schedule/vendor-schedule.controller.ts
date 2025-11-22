import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { VendorScheduleService } from './vendor-schedule.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('vendor-schedule')
export class VendorScheduleController {
  constructor(private vendorScheduleService: VendorScheduleService) {}

  @Get('slots/:vendorId')
  async getScheduleSlots(@Param('vendorId') vendorId: string, @Request() req) {
    // Allow public access to view vendor schedules (for booking)
    // Only require auth for modifications
    try {
      return await this.vendorScheduleService.getScheduleSlots(vendorId);
    } catch (error) {
      console.error('Error fetching schedule slots:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('slots/toggle')
  async toggleSlotAvailability(
    @Request() req,
    @Body() body: { slotDate: string; slotTime: string; isBlocked: boolean }
  ) {
    const vendorId = req.user.sub || req.user.id;
    return this.vendorScheduleService.toggleSlotAvailability(
      vendorId,
      body.slotDate,
      body.slotTime,
      body.isBlocked
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('days/toggle')
  async toggleDayAvailability(
    @Request() req,
    @Body() body: { slotDate: string; isBlocked: boolean }
  ) {
    const vendorId = req.user.sub || req.user.id;
    console.log('📥 [CONTROLLER] toggleDayAvailability received:', {
      vendorId,
      slotDate: body.slotDate,
      isBlocked: body.isBlocked,
      requestBody: body,
    });
    return this.vendorScheduleService.toggleDayAvailability(
      vendorId,
      body.slotDate,
      body.isBlocked
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('days/toggle-multiple')
  async toggleMultipleDaysAvailability(
    @Request() req,
    @Body() body: { dates: string[]; isBlocked: boolean }
  ) {
    const vendorId = req.user.sub || req.user.id;
    return this.vendorScheduleService.toggleMultipleDaysAvailability(
      vendorId,
      body.dates,
      body.isBlocked
    );
  }
}

