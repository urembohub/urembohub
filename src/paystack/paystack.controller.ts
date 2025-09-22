import { Controller, Get, Post, Put, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { PaystackService } from './paystack.service';
import { CreateSubaccountDto, UpdateSubaccountDto } from './dto/create-subaccount.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('paystack')
export class PaystackController {
  constructor(private readonly paystackService: PaystackService) {}

  /**
   * Test Paystack API connection
   * GET /paystack/test
   */
  @Get('test')
  async testConnection() {
    return this.paystackService.testConnection();
  }

  /**
   * Get list of banks
   * GET /paystack/banks
   */
  @Get('banks')
  async getBanks() {
    return this.paystackService.getBanks();
  }

  /**
   * Create a sub-account for the current user
   * POST /paystack/subaccount
   */
  @Post('subaccount')
  @UseGuards(JwtAuthGuard)
  async createSubaccount(@Body() createSubaccountDto: CreateSubaccountDto, @Request() req: any) {
    const userId = req.user.sub;
    console.log('🔍 [CONTROLLER_SUBACCOUNT_CREATE] Received sub-account creation request:', {
      userId,
      userEmail: req.user.email,
      createSubaccountDto
    });
    
    const result = await this.paystackService.createSubaccount(userId, createSubaccountDto);
    
    console.log('🔍 [CONTROLLER_SUBACCOUNT_CREATE] Service result:', result);
    
    return result;
  }

  /**
   * Get sub-account information for the current user
   * GET /paystack/subaccount
   */
  @Get('subaccount')
  @UseGuards(JwtAuthGuard)
  async getSubaccount(@Request() req: any) {
    const userId = req.user.sub;
    return this.paystackService.getSubaccount(userId);
  }

  /**
   * Update sub-account information for the current user
   * PUT /paystack/subaccount
   */
  @Put('subaccount')
  @UseGuards(JwtAuthGuard)
  async updateSubaccount(@Body() updateSubaccountDto: UpdateSubaccountDto, @Request() req: any) {
    const userId = req.user.sub;
    return this.paystackService.updateSubaccount(userId, updateSubaccountDto);
  }

  /**
   * Delete sub-account for the current user
   * DELETE /paystack/subaccount
   */
  @Delete('subaccount')
  @UseGuards(JwtAuthGuard)
  async deleteSubaccount(@Request() req: any) {
    const userId = req.user.sub;
    return this.paystackService.deleteSubaccount(userId);
  }

  /**
   * Clear orphaned sub-account record for current user
   * POST /paystack/clear-subaccount
   */
  @Post('clear-subaccount')
  @UseGuards(JwtAuthGuard)
  async clearSubaccount(@Request() req: any) {
    const userId = req.user.sub;
    return this.paystackService.clearOrphanedSubaccount(userId);
  }

  /**
   * Test sub-account creation (for testing purposes only)
   * POST /paystack/test-subaccount
   */
  @Post('test-subaccount')
  async testCreateSubaccount(@Body() createSubaccountDto: CreateSubaccountDto) {
    // This is a test endpoint - in production, you'd use the authenticated endpoint
    const testUserId = 'test-user-id'; // You'll need to replace this with a real user ID
    return this.paystackService.createSubaccount(testUserId, createSubaccountDto);
  }
}
