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
  Req,
  ForbiddenException
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

  @Get('vendor/:vendorId/service-appointments')
  @UseGuards(OptionalJwtAuthGuard)
  async getServiceAppointmentsByVendorId(
    @Param('vendorId') vendorId: string,
    @Req() req: any,
  ) {
    console.log('📋 [ORDERS_CONTROLLER] getServiceAppointmentsByVendorId called:', {
      vendorId,
      hasUser: !!req?.user,
      userId: req?.user?.sub || req?.user?.id,
      userRole: req?.user?.role,
    });
    
    // Allow access if:
    // 1. No user (public access for client booking page)
    // 2. User is the vendor themselves
    // 3. User is an admin
    // 4. User is a client (they need to see appointments to check availability)
    if (req?.user) {
      const userId = req.user.sub || req.user.id;
      const userRole = req.user.role;
      
      // Block only if user is a vendor trying to access another vendor's appointments
      // (admins can always access, clients can access to check availability)
      if (userRole === 'vendor' && userId !== vendorId) {
        console.log('❌ [ORDERS_CONTROLLER] Access denied:', {
          userId,
          vendorId,
          role: userRole,
        });
        throw new Error('Access denied: You can only access your own service appointments');
      }
      
      // Allow clients and admins to access any vendor's appointments
      // (clients need this to check availability when booking)
    }
    
    // For clients/public, return limited data (only date/time, no sensitive info)
    const includeSensitiveData = req?.user && (req.user.role === 'vendor' || req.user.role === 'admin');
    
    return this.ordersService.getServiceAppointmentsByVendorId(vendorId, includeSensitiveData);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('service-appointments/:id/status')
  async updateServiceAppointmentStatus(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { status: string; notes?: string }
  ) {
    console.log('📋 [ORDERS_CONTROLLER] ===========================================');
    console.log('📋 [ORDERS_CONTROLLER] PATCH /orders/service-appointments/:id/status called');
    console.log('📋 [ORDERS_CONTROLLER] ===========================================');
    console.log('📋 [ORDERS_CONTROLLER] Appointment ID:', id);
    console.log('📋 [ORDERS_CONTROLLER] Request body:', JSON.stringify(body, null, 2));
    console.log('📋 [ORDERS_CONTROLLER] User ID:', req.user?.sub || req.user?.id);
    console.log('📋 [ORDERS_CONTROLLER] User Role:', req.user?.role);
    
    return this.ordersService.updateServiceAppointmentStatus(
      id,
      req.user.sub || req.user.id,
      req.user.role,
      body.status,
      body.notes
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('service-appointments/:id/date')
  async updateServiceAppointmentDate(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { appointmentDate: string; notes?: string }
  ) {
    return this.ordersService.updateServiceAppointmentDate(
      id,
      req.user.sub,
      req.user.role,
      body.appointmentDate,
      body.notes
    );
  }

  @Post(':id/payment/initialize')
  @UseGuards(JwtAuthGuard)
  async initializePayment(@Param('id') id: string, @Request() req) {
    // CHANGE: enforce owner/admin access for client orders
    const order = await this.ordersService.getOrderById(id);
    const isOwner = order.userId ? order.userId === req.user.sub : order.customerEmail === req.user.email;
    if (req.user.role !== 'admin' && !isOwner) {
      throw new ForbiddenException('You can only initialize payment for your own orders');
    }

    return this.ordersService.initializePayment(id);
  }
}
