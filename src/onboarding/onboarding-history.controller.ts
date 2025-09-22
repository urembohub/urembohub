import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { OnboardingHistoryService } from './onboarding-history.service';
import { CreateHistoryEntryDto } from './dto/create-history-entry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('onboarding/history')
@UseGuards(JwtAuthGuard)
export class OnboardingHistoryController {
  constructor(private onboardingHistoryService: OnboardingHistoryService) {}

  @Post()
  async createHistoryEntry(@Body() createHistoryEntryDto: CreateHistoryEntryDto) {
    return this.onboardingHistoryService.createHistoryEntry(createHistoryEntryDto);
  }

  @Get('user/:userId')
  async getUserHistory(@Param('userId') userId: string) {
    return this.onboardingHistoryService.getUserHistory(userId);
  }

  @Get('my')
  async getMyHistory(@Request() req) {
    return this.onboardingHistoryService.getUserHistory(req.user.sub);
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  async getAdminHistory(@Request() req) {
    return this.onboardingHistoryService.getAdminHistory(req.user.sub);
  }

  @Get('all')
  @UseGuards(AdminGuard)
  async getAllHistory() {
    return this.onboardingHistoryService.getAllHistory();
  }
}

