import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CartCleanupService } from './cart-cleanup.service';

interface CartValidationRequest {
  productIds: string[];
  serviceIds: string[];
}

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartCleanupController {
  constructor(private cartCleanupService: CartCleanupService) {}

  /**
   * Validate cart items and return only active products/services
   * This endpoint should be called by the frontend to clean up cart items
   */
  @Post('validate')
  async validateCartItems(@Body() request: CartValidationRequest) {
    const { productIds, serviceIds } = request;
    
    const activeItems = await this.cartCleanupService.getActiveItemIds(
      productIds || [],
      serviceIds || []
    );

    return {
      success: true,
      data: activeItems,
      message: 'Cart validation completed'
    };
  }
}
