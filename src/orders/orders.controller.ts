import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Patch,
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request,
  Req
} from '@nestjs/common';
import { OrdersService, CreateOrderDto, UpdateOrderDto } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { order_status } from '@prisma/client';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { DisputeOrderDto } from './dto/dispute-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  async getAllOrders(
    @Query('status') status?: string,
    @Query('paymentDueAtDoor') paymentDueAtDoor?: string,
  ) {
    const paymentDueAtDoorBool = paymentDueAtDoor === 'true' ? true : paymentDueAtDoor === 'false' ? false : undefined;
    return this.ordersService.getAllOrders(status as any, paymentDueAtDoorBool);
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    // Allow both authenticated and guest users to create orders
    return this.ordersService.createOrder(null, createOrderDto);
  }

  @Post('create-doorstep-payment-due')
  @UseGuards(OptionalJwtAuthGuard)
  async createDoorstepPaymentDueOrder(@Body() createOrderDto: CreateOrderDto, @Request() req?: any) {
    // Extract userId from authenticated user if available
    // OptionalJwtAuthGuard allows the request even without a token (guest checkout)
    const userId = req?.user?.sub || null;
    console.log('📝 [DOORSTEP_ORDER] Creating doorstep payment due order:', {
      userId,
      customerEmail: createOrderDto.customerEmail,
      hasUser: !!req?.user,
      userEmail: req?.user?.email
    });
    return this.ordersService.createDoorstepPaymentDueOrder(userId, createOrderDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('authenticated')
  async createAuthenticatedOrder(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.sub, createOrderDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateOrder(
    @Param('id') id: string,
    @Request() req,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.updateOrder(id, req.user.sub, req.user.role, updateOrderDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/orders')
  async getUserOrders(
    @Request() req,
    @Query('paymentDueAtDoor') paymentDueAtDoor?: string,
  ) {
    const paymentDueAtDoorBool = paymentDueAtDoor === 'true' ? true : paymentDueAtDoor === 'false' ? false : undefined;
    return this.ordersService.getUserOrders(req.user.sub, paymentDueAtDoorBool);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/confirm')
  async confirmOrder(@Param('id') id: string, @Request() req) {
    return this.ordersService.confirmOrder(id, req.user.sub, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/complete')
  async completeOrder(@Param('id') id: string, @Request() req) {
    return this.ordersService.completeOrder(id, req.user.sub, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Request() req,
    @Body() body: CancelOrderDto
  ) {
    return this.ordersService.cancelOrder(id, req.user.sub, req.user.role, body.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/dispute')
  async disputeOrder(
    @Param('id') id: string,
    @Request() req,
    @Body() body: DisputeOrderDto
  ) {
    return this.ordersService.disputeOrder(id, req.user.sub, body.reason, body.evidence);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:status')
  async getOrdersByStatus(
    @Param('status') status: order_status,
  ) {
    return this.ordersService.getOrdersByStatus(status);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  async getOrdersByUser(
    @Param('userId') userId: string,
    @Request() req,
  ) {
    return this.ordersService.getOrdersByUser(userId, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get('retailer/:retailerId/order-items')
  async getOrderItemsByRetailerId(
    @Param('retailerId') retailerId: string,
    @Req() req: any,
  ) {
    try {
      // Ensure user can only access their own data or is admin
      const userId = req.user.sub || req.user.id;
      if (userId !== retailerId && req.user.role !== 'admin') {
        throw new Error('Access denied: You can only access your own order items');
      }
      
      return this.ordersService.getOrderItemsByRetailerId(retailerId);
    } catch (error) {
      console.error('Error in getOrderItemsByRetailerId:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('vendor/:vendorId/service-appointments')
  async getServiceAppointmentsByVendorId(
    @Param('vendorId') vendorId: string,
    @Req() req: any,
  ) {
    // Ensure user can only access their own data or is admin
    const userId = req.user.sub || req.user.id;
    if (userId !== vendorId && req.user.role !== 'admin') {
      throw new Error('Access denied: You can only access your own service appointments');
    }
    return this.ordersService.getServiceAppointmentsByVendorId(vendorId);
  }
}
