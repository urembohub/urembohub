import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartCleanupService {
  constructor(private prisma: PrismaService) {}

  /**
   * Clean up cart items for deleted products/services
   * This method should be called when products or services are deleted
   */
  async cleanupDeletedItems(deletedProductIds: string[], deletedServiceIds: string[]) {
    try {
      console.log('🧹 [CART_CLEANUP] Starting cart cleanup for deleted items');
      console.log(`  - Deleted products: ${deletedProductIds.length}`);
      console.log(`  - Deleted services: ${deletedServiceIds.length}`);

      // Remove wishlist items for deleted products/services
      const deletedWishlistItems = await this.prisma.wishlist.deleteMany({
        where: {
          OR: [
            { productId: { in: deletedProductIds } },
            { serviceId: { in: deletedServiceIds } }
          ]
        }
      });

      console.log(`✅ [CART_CLEANUP] Removed ${deletedWishlistItems.count} wishlist items`);

      // Note: Cart items are stored in localStorage on the frontend
      // We'll need to handle this on the frontend side by checking product/service availability
      // when loading cart items

      return {
        success: true,
        message: 'Cart cleanup completed',
        deletedWishlistItems: deletedWishlistItems.count,
        deletedProductIds,
        deletedServiceIds
      };
    } catch (error) {
      console.error('❌ [CART_CLEANUP] Error during cart cleanup:', error);
      throw new Error(`Failed to cleanup cart items: ${error.message}`);
    }
  }

  /**
   * Get list of active product/service IDs for cart validation
   */
  async getActiveItemIds(productIds: string[], serviceIds: string[]) {
    try {
      const [activeProducts, activeServices] = await Promise.all([
        this.prisma.product.findMany({
          where: { 
            id: { in: productIds },
            isActive: true 
          },
          select: { id: true }
        }),
        this.prisma.service.findMany({
          where: { 
            id: { in: serviceIds },
            isActive: true 
          },
          select: { id: true }
        })
      ]);

      return {
        activeProductIds: activeProducts.map(p => p.id),
        activeServiceIds: activeServices.map(s => s.id)
      };
    } catch (error) {
      console.error('❌ [CART_CLEANUP] Error getting active items:', error);
      throw new Error(`Failed to get active items: ${error.message}`);
    }
  }
}
