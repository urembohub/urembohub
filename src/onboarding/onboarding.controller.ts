import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request,
  ParseUUIDPipe 
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { SubmitRequirementDto } from './dto/submit-requirement.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { BulkSubmitDto } from './dto/bulk-submit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { user_role, onboarding_status } from '@prisma/client';

@Controller('onboarding')
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  // Requirements Management (Admin only)
  @UseGuards(JwtAuthGuard)
  @Post('requirements')
  async createRequirement(@Body() createRequirementDto: CreateRequirementDto, @Request() req) {
    // TODO: Add admin role check
    return this.onboardingService.createRequirement(createRequirementDto);
  }

  @Get('requirements')
  async getAllRequirements() {
    return this.onboardingService.getAllRequirements();
  }

  @Get('requirements/role/:role')
  async getRequirementsByRole(@Param('role') role: user_role) {
    return this.onboardingService.getRequirementsByRole(role);
  }

  @Get('requirements/:id')
  async getRequirementById(@Param('id', ParseUUIDPipe) id: string) {
    return this.onboardingService.getRequirementById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('requirements/:id')
  async updateRequirement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRequirementDto: UpdateRequirementDto,
    @Request() req
  ) {
    // TODO: Add admin role check
    return this.onboardingService.updateRequirement(id, updateRequirementDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('requirements/:id')
  async deleteRequirement(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    // TODO: Add admin role check
    return this.onboardingService.deleteRequirement(id);
  }

  // Submissions Management
  @UseGuards(JwtAuthGuard)
  @Post('submissions')
  async submitRequirement(@Body() submitRequirementDto: SubmitRequirementDto, @Request() req) {
    return this.onboardingService.submitRequirement(req.user.sub, submitRequirementDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('submissions/bulk')
  async bulkSubmitRequirements(@Body() bulkSubmitDto: BulkSubmitDto, @Request() req) {
    console.log('bulkSubmitDto', bulkSubmitDto);
    return this.onboardingService.bulkSubmitRequirements(req.user.sub, bulkSubmitDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('submissions/my')
  async getMySubmissions(@Request() req) {
    return this.onboardingService.getUserSubmissions(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('submissions/my/incomplete')
  async getMyIncompleteSubmissions(@Request() req) {
    return this.onboardingService.getIncompleteSubmissions(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('submissions/:id')
  async getSubmissionById(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.onboardingService.getSubmissionById(id);
  }


  @UseGuards(JwtAuthGuard)
  @Get('submissions/user/:userId')
  async getUserSubmissions(@Param('userId', ParseUUIDPipe) userId: string, @Request() req) {
    // TODO: Add admin role check or user can only view their own
    return this.onboardingService.getUserSubmissions(userId);
  }

  // Reviews Management (Admin only)
  @UseGuards(JwtAuthGuard)
  @Post('reviews')
  async createReview(@Body() reviewSubmissionDto: ReviewSubmissionDto, @Request() req) {
    // TODO: Add admin role check
    return this.onboardingService.createReview(req.user.sub, reviewSubmissionDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('reviews/my')
  async getMyReviews(@Request() req) {
    return this.onboardingService.getUserReviews(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('reviews')
  async getAllReviews(@Request() req) {
    // TODO: Add admin role check
    return this.onboardingService.getAllReviews();
  }

  @UseGuards(JwtAuthGuard)
  @Get('reviews/:id')
  async getReviewById(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.onboardingService.getReviewById(id);
  }

  // Status Management (Admin only)
  @UseGuards(JwtAuthGuard)
  @Put('status/:userId')
  async updateUserOnboardingStatus(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { status: onboarding_status; notes?: string; rejectionReason?: string },
    @Request() req
  ) {
    // TODO: Add admin role check
    return this.onboardingService.updateUserOnboardingStatus(
      userId,
      body.status,
      req.user.sub,
      body.notes,
      body.rejectionReason
    );
  }

  // Dashboard and Analytics
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getOnboardingStats(@Request() req) {
    // TODO: Add admin role check
    return this.onboardingService.getOnboardingStats();
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/status/:status')
  async getUsersByOnboardingStatus(
    @Param('status') status: onboarding_status,
    @Request() req
  ) {
    // TODO: Add admin role check
    return this.onboardingService.getUsersByOnboardingStatus(status);
  }

  // History Management (Admin only)
  @UseGuards(JwtAuthGuard)
  @Get('history/:userId')
  async getUserHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req
  ) {
    // TODO: Add admin role check
    return this.onboardingService.getUserHistory(userId);
  }

  // Public endpoints for role-based requirements
  @Get('requirements/public/:role')
  async getPublicRequirementsByRole(@Param('role') role: user_role) {
    return this.onboardingService.getRequirementsByRole(role);
  }
}
