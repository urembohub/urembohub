import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { ServiceCategoriesService } from './service-categories.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('service-categories')
export class ServiceCategoriesController {
  constructor(private serviceCategoriesService: ServiceCategoriesService) {}

  @Get()
  async getAllServiceCategories() {
    return this.serviceCategoriesService.getAllServiceCategories();
  }

  @Get('active')
  async getActiveServiceCategories() {
    return this.serviceCategoriesService.getActiveServiceCategories();
  }

  @Get('stats')
  async getServiceCategoryStats() {
    return this.serviceCategoriesService.getServiceCategoryStats();
  }

  @Get('level/:level')
  async getServiceCategoriesByLevel(@Param('level') level: string) {
    const levelNum = parseInt(level, 10);
    if (isNaN(levelNum) || levelNum < 1 || levelNum > 3) {
      throw new Error('Level must be 1, 2, or 3');
    }
    return this.serviceCategoriesService.getServiceCategoriesByLevel(levelNum);
  }

  @Get('parent/:parentId/children')
  async getChildCategories(@Param('parentId') parentId: string) {
    return this.serviceCategoriesService.getChildCategories(parentId);
  }

  @Get('root')
  async getRootCategories() {
    return this.serviceCategoriesService.getRootCategories();
  }

  @Get(':id')
  async getServiceCategoryById(@Param('id') id: string) {
    return this.serviceCategoriesService.getServiceCategoryById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createServiceCategory(@Body() createServiceCategoryDto: CreateServiceCategoryDto) {
    return this.serviceCategoriesService.createServiceCategory(createServiceCategoryDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateServiceCategory(
    @Param('id') id: string,
    @Body() updateServiceCategoryDto: UpdateServiceCategoryDto
  ) {
    return this.serviceCategoriesService.updateServiceCategory(id, updateServiceCategoryDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteServiceCategory(
    @Param('id') id: string,
    @Query('recursive') recursive?: string
  ) {
    const isRecursive = recursive === 'true';
    return this.serviceCategoriesService.deleteServiceCategory(id, isRecursive);
  }
}
