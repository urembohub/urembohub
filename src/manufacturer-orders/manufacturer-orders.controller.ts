import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ManufacturerOrdersService } from './manufacturer-orders.service';
import { CreateManufacturerOrderDto } from './dto/create-manufacturer-order.dto';
import { UpdateManufacturerOrderDto } from './dto/update-manufacturer-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('manufacturer-orders')
export class ManufacturerOrdersController {
  constructor(private readonly manufacturerOrdersService: ManufacturerOrdersService) {}

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
      retailerId,
    );
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    return this.manufacturerOrdersService.getOrderById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrder(@Body() createOrderDto: CreateManufacturerOrderDto, @Request() req) {
    return this.manufacturerOrdersService.createOrder(createOrderDto, req.user.sub);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateOrder(@Param('id') id: string, @Body() updateOrderDto: UpdateManufacturerOrderDto, @Request() req) {
    return this.manufacturerOrdersService.updateOrder(id, updateOrderDto, req.user.sub, req.user.role);
  }

  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOrder(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req) {
    return this.manufacturerOrdersService.cancelOrder(id, req.user.sub, req.user.role, body.reason);
  }

  @Put(':id/mark-delivered')
  @UseGuards(JwtAuthGuard)
  async markDelivered(@Param('id') id: string, @Request() req) {
    return this.manufacturerOrdersService.markDelivered(id, req.user.sub, req.user.role);
  }

  @Put(':id/mark-received')
  @UseGuards(JwtAuthGuard)
  async markReceived(@Param('id') id: string, @Body() body: { notes?: string }, @Request() req) {
    return this.manufacturerOrdersService.markReceived(id, req.user.sub, req.user.role, body.notes);
  }

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

  @Get('my/orders')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    if (req.user.role === 'manufacturer') {
      return this.manufacturerOrdersService.getManufacturerOrders(req.user.sub, pageNum, limitNum, status);
    }

    if (req.user.role === 'retailer') {
      return this.manufacturerOrdersService.getRetailerOrders(req.user.sub, pageNum, limitNum, status);
    }

    return { orders: [], pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 } };
  }

  @Get('my/purchases')
  @UseGuards(JwtAuthGuard)
  async getMyPurchases(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    if (req.user.role !== 'retailer' && req.user.role !== 'admin') {
      throw new ForbiddenException('Only retailers can view purchase tracking');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.manufacturerOrdersService.getRetailerPurchases(req.user.sub, pageNum, limitNum, status, paymentStatus);
  }

  @Get('stats/overview')
  @UseGuards(JwtAuthGuard)
  async getManufacturerOrderStats(@Request() req) {
    if (req.user.role === 'manufacturer') {
      return this.manufacturerOrdersService.getManufacturerOrderStats(req.user.sub);
    }

    if (req.user.role === 'retailer') {
      return this.manufacturerOrdersService.getManufacturerOrderStats(undefined, req.user.sub);
    }

    if (req.user.role === 'admin') {
      return this.manufacturerOrdersService.getManufacturerOrderStats();
    }

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

  @Get('search/query')
  @UseGuards(JwtAuthGuard)
  async searchOrders(@Request() req, @Query('q') query: string) {
    if (req.user.role === 'manufacturer') {
      return this.manufacturerOrdersService.searchOrders(query, req.user.sub);
    }

    if (req.user.role === 'retailer') {
      return this.manufacturerOrdersService.searchOrders(query, undefined, req.user.sub);
    }

    if (req.user.role === 'admin') {
      return this.manufacturerOrdersService.searchOrders(query);
    }

    return [];
  }

  @Post(':id/payment/initialize')
  @UseGuards(JwtAuthGuard)
  async initializePayment(@Param('id') id: string, @Request() req) {
    const order = await this.manufacturerOrdersService.getOrderById(id);
    if (req.user.role !== 'admin' && order.retailerId !== req.user.sub) {
      throw new ForbiddenException('You can only initialize payment for your own orders');
    }

    return this.manufacturerOrdersService.initializePayment(id);
  }

  @Post('shipping/calculate')
  @UseGuards(JwtAuthGuard)
  async calculateShippingBeforeOrder(@Body() body: { manufacturerId: string; packageValue: number }, @Request() req) {
    if (req.user.role !== 'retailer' && req.user.role !== 'admin') {
      throw new ForbiddenException('Only retailers can calculate shipping');
    }

    return this.manufacturerOrdersService.calculateShippingBeforeOrder(body.manufacturerId, req.user.sub, body.packageValue);
  }

  @Post(':id/shipping/calculate')
  @UseGuards(JwtAuthGuard)
  async calculateShipping(@Param('id') id: string, @Request() req) {
    const order = await this.manufacturerOrdersService.getOrderById(id);
    if (req.user.role !== 'admin' && order.retailerId !== req.user.sub && order.manufacturerId !== req.user.sub) {
      throw new ForbiddenException('You can only calculate shipping for your own orders');
    }

    return this.manufacturerOrdersService.calculateShipping(id);
  }
}
