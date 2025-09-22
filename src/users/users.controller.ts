import { 
  Controller, 
  Get, 
  Put, 
  Post,
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request,
  Delete,
  Patch
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { user_role, onboarding_status } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { UpdateOnboardingStatusDto } from './dto/update-onboarding-status.dto';
import { UpdatePaymentDetailsDto } from './dto/update-payment-details.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.sub);
  }

  @Put('profile')
  async updateProfile(@Request() req, @Body() updateData: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.sub, updateData);
  }

  @Get()
  async getAllUsers(
    @Query('role') role?: user_role,
  ) {
    return this.usersService.getAllUsers(role);
  }

  @Get('unverified')
  async getUnverifiedUsers(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.usersService.getUnverifiedUsers(limitNum);
  }

  @Get('suspended')
  async getSuspendedUsers() {
    return this.usersService.getSuspendedUsers();
  }

  @Get('role/:role')
  async getUsersByRole(
    @Param('role') role: user_role,
  ) {
    return this.usersService.getUsersByRole(role);
  }

  @Get('onboarding/:status')
  async getUsersByOnboardingStatus(
    @Param('status') status: onboarding_status,
  ) {
    return this.usersService.getUsersByOnboardingStatus(status);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/verify')
  async verifyUser(@Param('id') id: string) {
    return this.usersService.verifyUser(id);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Post()
  async createUser(@Body() createData: CreateUserDto) {
    return this.usersService.createUser(createData);
  }

  @Patch(':id/suspend')
  async suspendUser(
    @Param('id') id: string,
    @Body() body: SuspendUserDto,
    @Request() req
  ) {
    return this.usersService.suspendUser(id, req.user.sub, body.reason);
  }

  @Patch(':id/unsuspend')
  async unsuspendUser(@Param('id') id: string) {
    return this.usersService.unsuspendUser(id);
  }

  @Patch(':id/onboarding-status')
  async updateOnboardingStatus(
    @Param('id') id: string,
    @Body() body: UpdateOnboardingStatusDto,
    @Request() req
  ) {
    return this.usersService.updateOnboardingStatus(
      id, 
      body.status, 
      req.user.sub, 
      body.notes, 
      body.rejectionReason
    );
  }

  @Put(':id/payment-details')
  async updatePaymentDetails(
    @Param('id') id: string,
    @Body() body: UpdatePaymentDetailsDto
  ) {
    return this.usersService.updatePaymentDetails(
      id,
      body.paymentAccountDetails,
      body.paymentAccountType
    );
  }

  @Patch(':id/verify-payment')
  async verifyPaymentDetails(@Param('id') id: string) {
    return this.usersService.verifyPaymentDetails(id);
  }

}
