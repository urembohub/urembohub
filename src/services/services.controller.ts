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
  Request 
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto, CreateStaffDto, UpdateStaffDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Get()
  async getAllServices(
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    const isActiveBool = isActive !== 'false';
    
    return this.servicesService.getAllServices(category, isActiveBool);
  }

  @Get(':id')
  async getServiceById(@Param('id') id: string) {
    return this.servicesService.getServiceById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createService(@Request() req, @Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.createService(req.user.sub, req.user.role, createServiceDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateService(
    @Param('id') id: string,
    @Request() req,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.servicesService.updateService(id, req.user.sub, req.user.role, updateServiceDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteService(@Param('id') id: string, @Request() req) {
    return this.servicesService.deleteService(id, req.user.sub, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/services')
  async getUserServices(
    @Request() req,
  ) {
    // Ensure we're using the authenticated user's ID from the JWT token
    const userId = req.user.sub || req.user.id;
    console.log(`[ServicesController] getUserServices - Authenticated user ID: ${userId}`);
    return this.servicesService.getUserServices(userId);
  }

  @Get('category/:category')
  async getServicesByCategory(
    @Param('category') category: string,
  ) {
    return this.servicesService.getServicesByCategory(category);
  }

  @Get('category-id/:categoryId')
  async getServicesByCategoryId(
    @Param('categoryId') categoryId: string,
  ) {
    return this.servicesService.getServicesByCategoryId(categoryId);
  }

  @Get('search')
  async searchServices(
    @Query('q') query: string,
  ) {
    return this.servicesService.searchServices(query);
  }

  @Get('delivery/:deliveryMethod')
  async getServicesByDeliveryMethod(
    @Param('deliveryMethod') deliveryMethod: string,
  ) {
    return this.servicesService.getServicesByDeliveryMethod(deliveryMethod);
  }

  @Get('price-range')
  async getServicesByPriceRange(
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    const minPriceNum = minPrice ? parseFloat(minPrice) : 0;
    const maxPriceNum = maxPrice ? parseFloat(maxPrice) : 999999;
    
    return this.servicesService.getServicesByPriceRange(minPriceNum, maxPriceNum);
  }

  @Get('duration/:maxDuration')
  async getServicesByDuration(
    @Param('maxDuration') maxDuration: string,
  ) {
    const maxDurationNum = parseInt(maxDuration, 10);
    
    return this.servicesService.getServicesByDuration(maxDurationNum);
  }

  @Get('tags')
  async getServicesByTags(
    @Query('tags') tags: string,
  ) {
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : [];
    
    return this.servicesService.getServicesByTags(tagsArray);
  }

  // Staff Management Endpoints
  @UseGuards(JwtAuthGuard)
  @Post('staff')
  async createStaff(
    @Body() createStaffDto: CreateStaffDto,
    @Request() req: any,
  ) {
    return this.servicesService.createStaff(req.user.sub, req.user.role, createStaffDto);
  }

  @Get('staff')
  async getAllStaff(
    @Query('vendorId') vendorId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const isActiveBool = isActive === undefined ? true : isActive === 'true';
    return this.servicesService.getAllStaff(vendorId, isActiveBool);
  }

  @Get('staff/:id')
  async getStaffById(@Param('id') id: string) {
    return this.servicesService.getStaffById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('staff/:id')
  async updateStaff(
    @Param('id') id: string,
    @Body() updateStaffDto: UpdateStaffDto,
    @Request() req: any,
  ) {
    return this.servicesService.updateStaff(id, req.user.id, req.user.role, updateStaffDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('staff/:id')
  async deleteStaff(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.servicesService.deleteStaff(id, req.user.id, req.user.role);
  }

  @Get('staff/vendor/:vendorId')
  async getStaffByVendorId(
    @Param('vendorId') vendorId: string,
    @Query('isActive') isActive?: string,
  ) {
    const isActiveBool = isActive === undefined ? true : isActive === 'true';
    return this.servicesService.getStaffByVendorId(vendorId, isActiveBool);
  }

  @Get('staff/search')
  async searchStaff(
    @Query('query') query: string,
    @Query('vendorId') vendorId?: string,
  ) {
    return this.servicesService.searchStaff(query, vendorId);
  }

  @Get('staff/specialties')
  async getStaffBySpecialties(
    @Query('specialties') specialties: string,
    @Query('vendorId') vendorId?: string,
  ) {
    const specialtiesArray = specialties ? specialties.split(',').map(s => s.trim()) : [];
    return this.servicesService.getStaffBySpecialties(specialtiesArray, vendorId);
  }
}
