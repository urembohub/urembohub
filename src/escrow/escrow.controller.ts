import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { user_role } from '@prisma/client';

@Controller('escrow')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {
    console.log('🔍 [ESCROW_CONTROLLER] Constructor called');
  }

  /**
   * Create escrow for service payment
   * POST /escrow
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createEscrow(@Body() createEscrowData: any, @Req() req: any) {
    // JWT strategy returns 'sub' not 'id'
    const userId = req.user.sub || req.user.id;
    return await this.escrowService.createEscrow({
      ...createEscrowData,
      createdBy: userId,
    });
  }

  /**
   * Start service (vendor only)
   * PUT /escrow/:id/start
   */
  @Put(':id/start')
  @UseGuards(JwtAuthGuard)
  async startService(@Param('id') escrowId: string, @Req() req: any) {
    console.log('🚀 [ESCROW_CONTROLLER] ===========================================');
    console.log('🚀 [ESCROW_CONTROLLER] PUT /escrow/:id/start called');
    console.log('🚀 [ESCROW_CONTROLLER] ===========================================');
    console.log('🚀 [ESCROW_CONTROLLER] Escrow ID:', escrowId);
    console.log('🚀 [ESCROW_CONTROLLER] User ID:', req.user?.sub || req.user?.id);
    console.log('🚀 [ESCROW_CONTROLLER] User Role:', req.user?.role);
    
    if (req.user.role !== user_role.vendor) {
      console.error('❌ [ESCROW_CONTROLLER] Access denied - only vendors can start services');
      throw new Error('Only vendors can start services');
    }
    // JWT strategy returns 'sub' not 'id'
    const vendorId = req.user.sub || req.user.id;
    console.log('✅ [ESCROW_CONTROLLER] User is vendor, proceeding to start service...');
    return await this.escrowService.startService(escrowId, vendorId);
  }

  /**
   * Initiate service completion - generates code and sends email (vendor only)
   * PUT /escrow/:id/complete
   */
  @Put(':id/complete')
  @UseGuards(JwtAuthGuard)
  async completeService(@Param('id') escrowId: string, @Req() req: any) {
    if (req.user.role !== user_role.vendor) {
      throw new Error('Only vendors can complete services');
    }
    // JWT strategy returns 'sub' not 'id'
    const vendorId = req.user.sub || req.user.id;
    return await this.escrowService.completeService(escrowId, vendorId);
  }

  /**
   * Verify completion code and complete service (vendor only)
   * PUT /escrow/:id/verify-complete
   */
  @Put(':id/verify-complete')
  @UseGuards(JwtAuthGuard)
  async verifyAndCompleteService(
    @Param('id') escrowId: string,
    @Body() body: { verificationCode: string },
    @Req() req: any
  ) {
    if (req.user.role !== user_role.vendor) {
      throw new Error('Only vendors can verify and complete services');
    }
    // JWT strategy returns 'sub' not 'id'
    const vendorId = req.user.sub || req.user.id;
    return await this.escrowService.verifyAndCompleteService(escrowId, vendorId, body.verificationCode);
  }

  /**
   * Approve service (customer only)
   * PUT /escrow/:id/approve
   */
  @Put(':id/approve')
  @UseGuards(JwtAuthGuard)
  // Customer only
  async approveService(@Param('id') escrowId: string, @Req() req: any) {
    if (req.user.role !== user_role.client) {
      throw new Error('Only customers can approve services');
    }
    // JWT strategy returns 'sub' not 'id'
    const customerId = req.user.sub || req.user.id;
    return await this.escrowService.approveService(escrowId, customerId);
  }

  /**
   * Dispute service (customer only)
   * PUT /escrow/:id/dispute
   */
  @Put(':id/dispute')
  @UseGuards(JwtAuthGuard)
  // Customer only
  async disputeService(
    @Param('id') escrowId: string,
    @Body() disputeData: { reason: string },
    @Req() req: any
  ) {
    if (req.user.role !== user_role.client) {
      throw new Error('Only customers can dispute services');
    }
    // JWT strategy returns 'sub' not 'id'
    const customerId = req.user.sub || req.user.id;
    return await this.escrowService.disputeService(escrowId, customerId, disputeData.reason);
  }

  /**
   * Admin release funds
   * PUT /escrow/:id/admin/release
   */
  @Put(':id/admin/release')
  @UseGuards(JwtAuthGuard)
  // Admin only
  async adminReleaseFunds(
    @Param('id') escrowId: string,
    @Body() releaseData: { reason?: string },
    @Req() req: any
  ) {
    if (req.user.role !== user_role.admin) {
      throw new Error('Only admins can release funds');
    }
    // JWT strategy returns 'sub' not 'id'
    const adminId = req.user.sub || req.user.id;
    return await this.escrowService.adminReleaseFunds(escrowId, adminId, releaseData.reason);
  }

  /**
   * Admin refund customer
   * PUT /escrow/:id/admin/refund
   */
  @Put(':id/admin/refund')
  @UseGuards(JwtAuthGuard)
  // Admin only
  async adminRefundCustomer(
    @Param('id') escrowId: string,
    @Body() refundData: { reason: string },
    @Req() req: any
  ) {
    if (req.user.role !== user_role.admin) {
      throw new Error('Only admins can refund customers');
    }
    // JWT strategy returns 'sub' not 'id'
    const adminId = req.user.sub || req.user.id;
    return await this.escrowService.adminRefundCustomer(escrowId, adminId, refundData.reason);
  }

  /**
   * Process auto-release (admin only)
   * POST /escrow/process-auto-release
   */
  @Post('process-auto-release')
  @UseGuards(JwtAuthGuard)
  // Admin only
  async processAutoRelease(@Req() req: any) {
    if (req.user.role !== user_role.admin) {
      throw new Error('Only admins can process auto-release');
    }
    return await this.escrowService.processAutoRelease();
  }

  /**
   * Test endpoint to check if controller is working
   * GET /escrow/test
   */
  @Get('test')
  async testEndpoint() {
    try {
      console.log('🔍 [ESCROW_CONTROLLER] Test endpoint called');
      return { message: 'Escrow controller is working!', timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('❌ [ESCROW_CONTROLLER] Error in test endpoint:', error);
      throw error;
    }
  }

  /**
   * Get escrow statistics (admin only)
   * GET /escrow/stats
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  // Admin only
  async getEscrowStats(@Req() req: any) {
    try {
      console.log('🔍 [ESCROW_CONTROLLER] getEscrowStats called');
      console.log('🔍 [ESCROW_CONTROLLER] User:', req.user);
      console.log('🔍 [ESCROW_CONTROLLER] User role:', req.user?.role);
      
      if (req.user.role !== user_role.admin) {
        console.log('❌ [ESCROW_CONTROLLER] Access denied - user is not admin');
        throw new Error('Only admins can view escrow statistics');
      }
      
      console.log('✅ [ESCROW_CONTROLLER] User is admin, fetching escrow stats...');
      const stats = await this.escrowService.getEscrowStats();
      console.log('🔍 [ESCROW_CONTROLLER] Escrow stats result:', stats);
      return stats;
    } catch (error) {
      console.error('❌ [ESCROW_CONTROLLER] Error in getEscrowStats:', error);
      throw error;
    }
  }

  /**
   * Get escrow statistics for vendor
   * GET /escrow/vendor/:vendorId/stats
   */
  @Get('vendor/:vendorId/stats')
  @UseGuards(JwtAuthGuard)
  // Vendor or Admin
  async getVendorEscrowStats(
    @Param('vendorId') vendorId: string,
    @Req() req: any
  ) {
    // JWT strategy returns 'sub' not 'id'
    const userId = req.user.sub || req.user.id;
    console.log(`[ESCROW_CONTROLLER] getVendorEscrowStats - Requested vendorId: ${vendorId}, Authenticated user ID: ${userId}, Role: ${req.user.role}`);
    
    // Check if user is the vendor or admin
    if (userId !== vendorId && req.user.role !== user_role.admin) {
      console.error(`[ESCROW_CONTROLLER] Access denied - User ${userId} trying to access vendor ${vendorId} stats`);
      throw new Error('Access denied');
    }
    
    const stats = await this.escrowService.getVendorEscrowStats(vendorId);
    console.log(`[ESCROW_CONTROLLER] Returning stats for vendor ${vendorId}:`, stats);
    return stats;
  }

  /**
   * Get escrows by vendor
   * GET /escrow/vendor/:vendorId
   */
  @Get('vendor/:vendorId')
  @UseGuards(JwtAuthGuard)
  // Vendor or Admin
  async getEscrowsByVendor(
    @Param('vendorId') vendorId: string,
    @Req() req: any,
    @Query('status') status?: string
  ) {
    // JWT strategy returns 'sub' not 'id'
    const userId = req.user.sub || req.user.id;
    console.log(`[ESCROW_CONTROLLER] getEscrowsByVendor - Requested vendorId: ${vendorId}, Authenticated user ID: ${userId}, Role: ${req.user.role}`);
    
    // Check if user is the vendor or admin
    if (userId !== vendorId && req.user.role !== user_role.admin) {
      console.error(`[ESCROW_CONTROLLER] Access denied - User ${userId} trying to access vendor ${vendorId} escrows`);
      throw new Error('Access denied');
    }
    
    const escrows = await this.escrowService.getEscrowsByVendor(vendorId, status as any);
    console.log(`[ESCROW_CONTROLLER] Returning ${escrows.length} escrows for vendor ${vendorId}`);
    return escrows;
  }

  /**
   * Get escrows by customer
   * GET /escrow/customer/:customerId
   */
  @Get('customer/:customerId')
  @UseGuards(JwtAuthGuard)
  // Client or Admin
  async getEscrowsByCustomer(
    @Param('customerId') customerId: string,
    @Req() req: any,
    @Query('status') status?: string
  ) {
    // JWT strategy returns 'sub' not 'id'
    const userId = req.user.sub || req.user.id;
    // Check if user is the customer or admin
    if (userId !== customerId && req.user.role !== user_role.admin) {
      throw new Error('Access denied');
    }
    
    return await this.escrowService.getEscrowsByCustomer(customerId, status as any);
  }

  /**
   * Get all escrows (admin only)
   * GET /escrow
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  // Admin only
  async getAllEscrows(@Req() req: any, @Query('status') status?: string) {
    if (req.user.role !== user_role.admin) {
      throw new Error('Only admins can view all escrows');
    }
    return await this.escrowService.getAllEscrows(status as any);
  }

  /**
   * Get escrow by ID
   * GET /escrow/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getEscrowById(@Param('id') escrowId: string, @Req() req: any) {
    // JWT strategy returns 'sub' not 'id'
    const userId = req.user.sub || req.user.id;
    const escrow = await this.escrowService.getEscrowById(escrowId);
    
    // Check if escrow exists
    if (!escrow) {
      throw new Error('Escrow not found');
    }
    
    // Check if user has access to this escrow
    if (escrow.vendorId !== userId && escrow.customerId !== userId && req.user.role !== user_role.admin) {
      throw new Error('Access denied');
    }
    
    return escrow;
  }
}