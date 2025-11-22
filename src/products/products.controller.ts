import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Patch,
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateStockDto } from './dto/update-stock.dto';
import { UpdateQcStatusDto } from './dto/update-qc-status.dto';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  async getAllProducts(
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const isActiveBool = isActive !== 'false';
    
    return this.productsService.getAllProducts(categoryId, isActiveBool);
  }

  @Get('categories')
  async getProductCategories() {
    return this.productsService.getProductCategories();
  }

  @Get('categories/:id')
  async getProductCategoryById(@Param('id') id: string) {
    return this.productsService.getProductCategoryById(id);
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createProduct(@Request() req, @Body() createProductDto: CreateProductDto) {
    return this.productsService.createProduct(req.user.sub, req.user.role, createProductDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Request() req,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(id, req.user.sub, req.user.role, updateProductDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteProduct(@Param('id') id: string, @Request() req) {
    return this.productsService.deleteProduct(id, req.user.sub, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/products')
  async getUserProducts(
    @Request() req,
  ) {
    return this.productsService.getUserProducts(req.user.sub);
  }

  @Get('category/:categoryId')
  async getProductsByCategory(
    @Param('categoryId') categoryId: string,
  ) {
    return this.productsService.getProductsByCategory(categoryId);
  }

  @Get('search')
  async searchProducts(
    @Query('q') query: string,
  ) {
    return this.productsService.searchProducts(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('manufacturer/restock/:retailerProductId')
  async getManufacturerProductsForRestock(
    @Param('retailerProductId') retailerProductId: string,
  ) {
    return this.productsService.getManufacturerProductsForRestock(retailerProductId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('manufacturer/available')
  async getAllAvailableManufacturerProducts(
    @Request() req,
  ) {
    console.log('🎯 [ProductsController] getAllAvailableManufacturerProducts called');
    console.log('   User ID:', req.user?.sub);
    console.log('   User Role:', req.user?.role);
    const result = await this.productsService.getAllAvailableManufacturerProducts(req.user.sub);
    console.log('   Result count:', Array.isArray(result) ? result.length : 'not an array');
    return result;
  }

  @Get('manufacturer/:manufacturerId')
  async getProductsByManufacturer(
    @Param('manufacturerId') manufacturerId: string,
  ) {
    return this.productsService.getProductsByManufacturer(manufacturerId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/stock')
  async updateStockQuantity(
    @Param('id') id: string,
    @Request() req,
    @Body() body: UpdateStockDto
  ) {
    return this.productsService.updateStockQuantity(id, req.user.sub, req.user.role, body.quantity);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/qc-status')
  async updateQcStatus(
    @Param('id') id: string,
    @Request() req,
    @Body() body: UpdateQcStatusDto
  ) {
    return this.productsService.updateQcStatus(id, req.user.sub, req.user.role, body.qcStatus);
  }

  @UseGuards(JwtAuthGuard)
  @Get('low-stock')
  async getLowStockProducts(
    @Query('threshold') threshold?: string,
  ) {
    const thresholdNum = threshold ? parseInt(threshold, 10) : 10;
    
    return this.productsService.getLowStockProducts(thresholdNum);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('bulk/individual-prices')
  async bulkUpdateIndividualPrices(
    @Request() req,
    @Body() body: { updates: { productId: string; newPrice: number }[] }
  ) {
    return this.productsService.bulkUpdateIndividualPrices(req.user.sub, req.user.role, body.updates);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('bulk/individual-stock')
  async bulkUpdateIndividualStock(
    @Request() req,
    @Body() body: { updates: { productId: string; newStock: number }[] }
  ) {
    return this.productsService.bulkUpdateIndividualStock(req.user.sub, req.user.role, body.updates);
  }
}
