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
  ForbiddenException
} from '@nestjs/common';
import { ManufacturerOrdersService } from './manufacturer-orders.service';
import { CreateManufacturerOrderDto } from './dto/create-manufacturer-order.dto';
import { UpdateManufacturerOrderDto } from './dto/update-manufacturer-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('manufacturer-orders')
export class ManufacturerOrdersController {
  constructor(private readonly manufacturerOrdersService: ManufacturerOrdersService) {}

  // Get all manufacturer orders with filtering and pagination
  @Get()
  async getAllOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('manufacturerId') manufacturerId?: string,
    @Query('retailerId') retailerId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    return this.manufacturerOrdersService.getAllOrders(
      pageNum,
      limitNum,
      status,
      manufacturerId,
      retailerId
    );
  }

  // Get order by ID
  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    return this.manufacturerOrdersService.getOrderById(id);
  }

  // Create new manufacturer order (retailer places order with manufacturer)
  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @Body() createOrderDto: CreateManufacturerOrderDto,
    @Request() req
  ) {
    return this.manufacturerOrdersService.createOrder(createOrderDto, req.user.sub);
  }

  // Update manufacturer order
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateOrder(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateManufacturerOrderDto,
    @Request() req
  ) {
    return this.manufacturerOrdersService.updateOrder(id, updateOrderDto, req.user.sub, req.user.role);
  }

  // Cancel manufacturer order
  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOrder(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req
  ) {
    return this.manufacturerOrdersService.cancelOrder(id, req.user.sub, req.user.role, body.reason);
  }

  // Get manufacturer's orders (orders received from retailers)
  @Get('manufacturer/:manufacturerId')
  async getManufacturerOrders(
    @Param('manufacturerId') manufacturerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    return this.manufacturerOrdersService.getManufacturerOrders(manufacturerId, pageNum, limitNum, status);
  }

  // Get retailer's orders (orders placed with manufacturers)
  @Get('retailer/:retailerId')
  async getRetailerOrders(
    @Param('retailerId') retailerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    return this.manufacturerOrdersService.getRetailerOrders(retailerId, pageNum, limitNum, status);
  }

  // Get user's orders (manufacturer or retailer)
  @Get('my/orders')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    if (req.user.role === 'manufacturer') {
      return this.manufacturerOrdersService.getManufacturerOrders(req.user.sub, pageNum, limitNum, status);
    } else if (req.user.role === 'retailer') {
      return this.manufacturerOrdersService.getRetailerOrders(req.user.sub, pageNum, limitNum, status);
    } else {
      return { orders: [], pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 } };
    }
  }

  // Get manufacturer order statistics
  @Get('stats/overview')
  @UseGuards(JwtAuthGuard)
  async getManufacturerOrderStats(@Request() req) {
    if (req.user.role === 'manufacturer') {
      return this.manufacturerOrdersService.getManufacturerOrderStats(req.user.sub);
    } else if (req.user.role === 'retailer') {
      return this.manufacturerOrdersService.getManufacturerOrderStats(undefined, req.user.sub);
    } else if (req.user.role === 'admin') {
      return this.manufacturerOrdersService.getManufacturerOrderStats();
    } else {
      return {
        totalOrders: 0,
        pendingOrders: 0,
        confirmedOrders: 0,
        processingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        totalRevenue: 0,
      };
    }
  }

  // Search manufacturer orders
  @Get('search/query')
  @UseGuards(JwtAuthGuard)
  async searchOrders(
    @Request() req,
    @Query('q') query: string
  ) {
    if (req.user.role === 'manufacturer') {
      return this.manufacturerOrdersService.searchOrders(query, req.user.sub);
    } else if (req.user.role === 'retailer') {
      return this.manufacturerOrdersService.searchOrders(query, undefined, req.user.sub);
    } else if (req.user.role === 'admin') {
      return this.manufacturerOrdersService.searchOrders(query);
    } else {
      return [];
    }
  }

  // Initialize payment for manufacturer order
  @Post(':id/payment/initialize')
  @UseGuards(JwtAuthGuard)
  async initializePayment(
    @Param('id') id: string,
    @Request() req
  ) {
    // Verify user has permission (retailer who placed the order)
    const order = await this.manufacturerOrdersService.getOrderById(id);
    if (req.user.role !== 'admin' && order.retailerId !== req.user.sub) {
      throw new ForbiddenException('You can only initialize payment for your own orders');
    }
    return this.manufacturerOrdersService.initializePayment(id);
  }

  // Calculate shipping for manufacturer order
  @Post(':id/shipping/calculate')
  @UseGuards(JwtAuthGuard)
  async calculateShipping(
    @Param('id') id: string,
    @Request() req
  ) {
    // Verify user has permission
    const order = await this.manufacturerOrdersService.getOrderById(id);
    if (req.user.role !== 'admin' && order.retailerId !== req.user.sub && order.manufacturerId !== req.user.sub) {
      throw new ForbiddenException('You can only calculate shipping for your own orders');
    }
    return this.manufacturerOrdersService.calculateShipping(id);
  }
}


