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
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { CreateUserReviewDto } from './dto/create-user-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // Get all reviews with filtering and pagination
  @Get()
  async getAllReviews(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('serviceId') serviceId?: string,
    @Query('vendorId') vendorId?: string,
    @Query('clientId') clientId?: string,
    @Query('minRating') minRating?: string,
    @Query('maxRating') maxRating?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const minRatingNum = minRating ? parseInt(minRating, 10) : undefined;
    const maxRatingNum = maxRating ? parseInt(maxRating, 10) : undefined;
    
    return this.reviewsService.getAllReviews(
      pageNum,
      limitNum,
      serviceId,
      vendorId,
      clientId,
      minRatingNum,
      maxRatingNum
    );
  }

  // Get review by ID
  @Get(':id')
  async getReviewById(@Param('id') id: string) {
    return this.reviewsService.getReviewById(id);
  }

  // Create new review
  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(
    @Body() createReviewDto: CreateReviewDto,
    @Request() req
  ) {
    return this.reviewsService.createReview(createReviewDto, req.user.sub);
  }

  // Update review
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateReview(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Request() req
  ) {
    return this.reviewsService.updateReview(id, updateReviewDto, req.user.sub);
  }

  // Delete review
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteReview(
    @Param('id') id: string,
    @Request() req
  ) {
    return this.reviewsService.deleteReview(id, req.user.sub, req.user.role);
  }

  // Get reviews by service ID
  @Get('service/:serviceId')
  async getReviewsByServiceId(
    @Param('serviceId') serviceId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    return this.reviewsService.getReviewsByServiceId(serviceId, pageNum, limitNum);
  }

  // Get reviews by vendor ID
  @Get('vendor/:vendorId')
  async getReviewsByVendorId(
    @Param('vendorId') vendorId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    return this.reviewsService.getReviewsByVendorId(vendorId, pageNum, limitNum);
  }

  // Get reviews by client ID
  @Get('client/:clientId')
  @UseGuards(JwtAuthGuard)
  async getReviewsByClientId(
    @Request() req,
    @Param('clientId') clientId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    // Check if user can view these reviews
    if (req.user.role !== 'admin' && req.user.sub !== clientId) {
      throw new Error('You can only view your own reviews');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    return this.reviewsService.getReviewsByClientId(clientId, pageNum, limitNum);
  }

  // Get review statistics
  @Get('stats/overview')
  async getReviewStats(
    @Query('serviceId') serviceId?: string,
    @Query('vendorId') vendorId?: string,
  ) {
    return this.reviewsService.getReviewStats(serviceId, vendorId);
  }

  // Get service rating summary
  @Get('service/:serviceId/summary')
  async getServiceRatingSummary(@Param('serviceId') serviceId: string) {
    return this.reviewsService.getServiceRatingSummary(serviceId);
  }

  // Get vendor rating summary
  @Get('vendor/:vendorId/summary')
  async getVendorRatingSummary(@Param('vendorId') vendorId: string) {
    return this.reviewsService.getVendorRatingSummary(vendorId);
  }

  // Search reviews
  @Get('search/query')
  async searchReviews(
    @Query('q') query: string,
    @Query('serviceId') serviceId?: string,
    @Query('vendorId') vendorId?: string,
  ) {
    return this.reviewsService.searchReviews(query, serviceId, vendorId);
  }

  // ========== PRODUCT REVIEW ENDPOINTS ==========

  // Get product reviews
  @Get('product/:productId')
  async getProductReviews(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    return this.reviewsService.getProductReviews(productId, pageNum, limitNum);
  }

  // Create product review
  @Post('product/:productId')
  @UseGuards(JwtAuthGuard)
  async createProductReview(
    @Param('productId') productId: string,
    @Body() createProductReviewDto: CreateProductReviewDto,
    @Request() req
  ) {
    return this.reviewsService.createProductReview(
      { ...createProductReviewDto, productId },
      req.user.sub
    );
  }

  // Get product rating summary
  @Get('product/:productId/summary')
  async getProductRatingSummary(@Param('productId') productId: string) {
    return this.reviewsService.getProductRatingSummary(productId);
  }

  // ========== USER REVIEW ENDPOINTS ==========

  // Get user reviews
  @Get('user/:userId')
  async getUserReviews(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    return this.reviewsService.getUserReviews(userId, pageNum, limitNum);
  }

  // Create user review
  @Post('user/:userId')
  @UseGuards(JwtAuthGuard)
  async createUserReview(
    @Param('userId') userId: string,
    @Body() createUserReviewDto: CreateUserReviewDto,
    @Request() req
  ) {
    return this.reviewsService.createUserReview(
      { ...createUserReviewDto, reviewedUserId: userId },
      req.user.sub
    );
  }

  // Get user rating summary
  @Get('user/:userId/summary')
  async getUserRatingSummary(@Param('userId') userId: string) {
    return this.reviewsService.getUserRatingSummary(userId);
  }

  // ========== GENERIC REVIEW ENDPOINTS (for products/users) ==========

  // Update generic review (product/user)
  @Put('generic/:id')
  @UseGuards(JwtAuthGuard)
  async updateGenericReview(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Request() req
  ) {
    return this.reviewsService.updateGenericReview(id, updateReviewDto, req.user.sub);
  }

  // Delete generic review (product/user)
  @Delete('generic/:id')
  @UseGuards(JwtAuthGuard)
  async deleteGenericReview(
    @Param('id') id: string,
    @Request() req
  ) {
    return this.reviewsService.deleteGenericReview(id, req.user.sub, req.user.role);
  }
}
