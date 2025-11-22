import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ManufacturerOrdersService } from '../manufacturer-orders/manufacturer-orders.service';
import { user_role } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private manufacturerOrdersService: ManufacturerOrdersService
  ) {}

  async createProduct(userId: string, userRole: user_role, createProductDto: CreateProductDto) {
    // Only retailers and manufacturers can create products
    if (userRole !== user_role.retailer && userRole !== user_role.manufacturer) {
      throw new ForbiddenException('Only retailers and manufacturers can create products');
    }

    const productData: any = {
      name: createProductDto.name,
      description: createProductDto.description,
      price: createProductDto.price,
      currency: createProductDto.currency || 'USD',
      stockQuantity: createProductDto.stockQuantity || 0,
      imageUrl: createProductDto.imageUrl,
      categoryId: createProductDto.categoryId,
      subcategoryId: createProductDto.subcategoryId,
      sku: createProductDto.sku,
      tags: createProductDto.tags || [],
      qcStatus: createProductDto.qcStatus,
      retailerId: userId,
      createdByRole: userRole,
    };

    // Add manufacturerId if provided and user is a manufacturer
    if (createProductDto.manufacturerId && userRole === user_role.manufacturer) {
      productData.manufacturerId = createProductDto.manufacturerId;
    } else if (userRole === user_role.manufacturer) {
      productData.manufacturerId = userId;
    }

    return this.prisma.product.create({
      data: productData,
      include: {
        retailer: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
      },
    });
  }

  async getAllProducts(categoryId?: string, isActive = true) {
    const where: any = { 
      isActive,
      // Exclude products created by manufacturers - they should not appear in the shop
      // This will include products with null createdByRole (legacy products) and all other roles
      NOT: {
        createdByRole: 'manufacturer'
      }
    };
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    const products = await this.prisma.product.findMany({
      where,
      include: {
        retailer: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products;
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        retailer: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async updateProduct(id: string, userId: string, userRole: user_role, updateProductDto: UpdateProductDto) {
    const product = await this.getProductById(id);

    // Only the product owner or admin can update
    if (product.retailerId !== userId && userRole !== user_role.admin) {
      throw new ForbiddenException('You can only update your own products');
    }

    // Filter out undefined values and map field names
    const updateData: any = {};
    if (updateProductDto.name !== undefined) updateData.name = updateProductDto.name;
    if (updateProductDto.description !== undefined) updateData.description = updateProductDto.description;
    if (updateProductDto.price !== undefined) updateData.price = updateProductDto.price;
    if (updateProductDto.currency !== undefined) updateData.currency = updateProductDto.currency;
    if (updateProductDto.stockQuantity !== undefined) updateData.stockQuantity = updateProductDto.stockQuantity;
    if (updateProductDto.imageUrl !== undefined) updateData.imageUrl = updateProductDto.imageUrl;
    if (updateProductDto.categoryId !== undefined) updateData.categoryId = updateProductDto.categoryId;
    if (updateProductDto.subcategoryId !== undefined) updateData.subcategoryId = updateProductDto.subcategoryId;
    if (updateProductDto.sku !== undefined) updateData.sku = updateProductDto.sku;
    if (updateProductDto.tags !== undefined) updateData.tags = updateProductDto.tags;
    if (updateProductDto.qcStatus !== undefined) updateData.qcStatus = updateProductDto.qcStatus;
    if (updateProductDto.manufacturerId !== undefined) updateData.manufacturerId = updateProductDto.manufacturerId;
    if (updateProductDto.isActive !== undefined) updateData.isActive = updateProductDto.isActive;

    return this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        retailer: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
      },
    });
  }

  async deleteProduct(id: string, userId: string, userRole: user_role) {
    const product = await this.getProductById(id);

    // Only the product owner or admin can delete
    if (product.retailerId !== userId && userRole !== user_role.admin) {
      throw new ForbiddenException('You can only delete your own products');
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }

  async getUserProducts(userId: string) {
    const products = await this.prisma.product.findMany({
      where: { retailerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        retailer: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
      },
    });

    return products;
  }

  async getProductsByCategory(categoryId: string) {
    const products = await this.prisma.product.findMany({
      where: { 
        categoryId,
        isActive: true,
      },
      include: {
        retailer: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products;
  }

  async getProductsByManufacturer(manufacturerId: string) {
    const products = await this.prisma.product.findMany({
      where: { 
        manufacturerId,
        isActive: true,
      },
      include: {
        retailer: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products;
  }

  async searchProducts(query: string) {
    const products = await this.prisma.product.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { 
                category: {
                  name: { contains: query, mode: 'insensitive' }
                }
              },
              { 
                subcategory: {
                  name: { contains: query, mode: 'insensitive' }
                }
              },
              { sku: { contains: query, mode: 'insensitive' } },
              { tags: { has: query } },
            ],
          },
        ],
      },
      include: {
        retailer: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products;
  }

  async updateStockQuantity(id: string, userId: string, userRole: user_role, quantity: number) {
    const product = await this.getProductById(id);

    // Only the product owner or admin can update stock
    if (product.retailerId !== userId && userRole !== user_role.admin) {
      throw new ForbiddenException('You can only update stock for your own products');
    }

    return this.prisma.product.update({
      where: { id },
      data: { stockQuantity: quantity },
    });
  }

  async updateQcStatus(id: string, userId: string, userRole: user_role, qcStatus: string) {
    const product = await this.getProductById(id);

    // Only the product owner or admin can update QC status
    if (product.retailerId !== userId && userRole !== user_role.admin) {
      throw new ForbiddenException('You can only update QC status for your own products');
    }

    return this.prisma.product.update({
      where: { id },
      data: { qcStatus },
    });
  }

  async getLowStockProducts(threshold = 10) {
    const products = await this.prisma.product.findMany({
      where: {
        stockQuantity: { lte: threshold },
        isActive: true,
      },
      include: {
        retailer: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
      },
      orderBy: { stockQuantity: 'asc' },
    });

    return products;
  }

  async getProductCategories() {
    return this.prisma.productCategory.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        imageUrl: true,
        level: true,
        parentId: true,
        position: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            level: true,
            position: true,
          },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: [
        { level: 'asc' },
        { position: 'asc' },
      ],
    });
  }

  async getProductCategoryById(id: string) {
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        imageUrl: true,
        level: true,
        parentId: true,
        position: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            level: true,
            position: true,
            imageUrl: true,
          },
          orderBy: { position: 'asc' },
        },
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            imageUrl: true,
            isActive: true,
          },
          where: { isActive: true },
          take: 10, // Limit to first 10 products for preview
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Product category not found');
    }

    return category;
  }

  async bulkUpdateIndividualPrices(
    userId: string, 
    userRole: user_role, 
    updates: { productId: string; newPrice: number }[]
  ) {
    try {
      const results = [];
      
      for (const update of updates) {
        // Get the product to verify ownership
        const product = await this.getProductById(update.productId);
        
        // Only the product owner or admin can update
        if (product.retailerId !== userId && userRole !== user_role.admin) {
          throw new ForbiddenException(`You can only update your own products. Product ${update.productId} is not yours.`);
        }

        // Update the product price
        const updatedProduct = await this.prisma.product.update({
          where: { id: update.productId },
          data: { price: update.newPrice },
          include: {
            retailer: {
              select: {
                id: true,
                email: true,
                fullName: true,
                businessName: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
              },
            },
            subcategory: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
              },
            },
          },
        });

        results.push({
          productId: update.productId,
          success: true,
          newPrice: update.newPrice,
          product: updatedProduct,
        });
      }

      return {
        success: true,
        message: `Successfully updated prices for ${results.length} products`,
        results,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to bulk update individual prices',
        results: [],
      };
    }
  }

  async bulkUpdateIndividualStock(
    userId: string, 
    userRole: user_role, 
    updates: { productId: string; newStock: number }[]
  ) {
    try {
      const results = [];
      
      for (const update of updates) {
        // Get the product to verify ownership
        const product = await this.getProductById(update.productId);
        
        // Only the product owner or admin can update
        if (product.retailerId !== userId && userRole !== user_role.admin) {
          throw new ForbiddenException(`You can only update your own products. Product ${update.productId} is not yours.`);
        }

        // Update the product stock
        const updatedProduct = await this.prisma.product.update({
          where: { id: update.productId },
          data: { stockQuantity: update.newStock },
          include: {
            retailer: {
              select: {
                id: true,
                email: true,
                fullName: true,
                businessName: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
              },
            },
            subcategory: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
              },
            },
          },
        });

        results.push({
          productId: update.productId,
          success: true,
          newStock: update.newStock,
          product: updatedProduct,
        });
      }

      return {
        success: true,
        message: `Successfully updated stock for ${results.length} products`,
        results,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to bulk update individual stock',
        results: [],
      };
    }
  }

  // Get manufacturer products available for restocking a specific retailer product
  async getManufacturerProductsForRestock(retailerProductId: string) {
    console.log(`🔍 [getManufacturerProductsForRestock] Fetching for retailer product: ${retailerProductId}`);
    
    // Get the retailer product
    const retailerProduct = await this.prisma.product.findUnique({
      where: { id: retailerProductId },
      include: {
        category: true,
        subcategory: true,
      },
    });

    if (!retailerProduct) {
      throw new NotFoundException('Retailer product not found');
    }

    console.log(`📦 [getManufacturerProductsForRestock] Retailer product:`, {
      id: retailerProduct.id,
      name: retailerProduct.name,
      sku: retailerProduct.sku,
      retailerId: retailerProduct.retailerId,
      categoryId: retailerProduct.categoryId,
      subcategoryId: retailerProduct.subcategoryId,
    });

    // Get all manufacturer profile IDs
    const manufacturerProfiles = await this.prisma.profile.findMany({
      where: {
        role: 'manufacturer',
      },
      select: {
        id: true,
      },
    });

    const manufacturerIds = manufacturerProfiles.map(p => p.id);
    console.log(`🏭 [getManufacturerProductsForRestock] Found ${manufacturerIds.length} manufacturer profiles`);

    if (manufacturerIds.length === 0) {
      console.log(`⚠️ [getManufacturerProductsForRestock] No manufacturers found in system`);
      return [];
    }

    // Build matching criteria: SKU first, then category/subcategory fallback
    // Manufacturer products are identified by manufacturerId field
    const where: any = {
      isActive: true,
      manufacturerId: {
        not: null,
        in: manufacturerIds, // manufacturerId must be in the list of manufacturer profile IDs
      },
      NOT: {
        retailerId: retailerProduct.retailerId, // Exclude retailer's own products
      },
    };

    // Primary match: SKU (case-insensitive)
    if (retailerProduct.sku) {
      where.sku = {
        equals: retailerProduct.sku,
        mode: 'insensitive',
      };
      console.log(`🔑 [getManufacturerProductsForRestock] Matching by SKU: ${retailerProduct.sku}`);
    } else {
      // Fallback: category + subcategory match
      if (retailerProduct.categoryId) {
        where.categoryId = retailerProduct.categoryId;
      }
      if (retailerProduct.subcategoryId) {
        where.subcategoryId = retailerProduct.subcategoryId;
      }
      console.log(`📂 [getManufacturerProductsForRestock] Matching by category/subcategory`);
    }

    console.log(`🔍 [getManufacturerProductsForRestock] Query where clause:`, JSON.stringify(where, null, 2));

    // Get matching manufacturer products
    // Manufacturer products are identified by manufacturerId field
    const manufacturerProducts = await this.prisma.product.findMany({
      where,
      include: {
        retailer: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
            phone: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`📦 [getManufacturerProductsForRestock] Found ${manufacturerProducts.length} manufacturer products before availability calculation`);

    // Calculate available stock for each product and fetch manufacturer info
    const productsWithAvailability = await Promise.all(
      manufacturerProducts.map(async (product) => {
        const reservedStock = await this.manufacturerOrdersService.calculateReservedStock(product.id);
        const availableStock = Math.max(0, product.stockQuantity - reservedStock);

        // Fetch manufacturer profile using manufacturerId
        let manufacturer = null;
        if (product.manufacturerId) {
          manufacturer = await this.prisma.profile.findUnique({
            where: { id: product.manufacturerId },
            select: {
              id: true,
              fullName: true,
              businessName: true,
              email: true,
              phone: true,
            },
          });
        }

        return {
          ...product,
          manufacturer: manufacturer || product.retailer, // Use manufacturer profile if available, fallback to retailer
          manufacturerId: product.manufacturerId || product.retailerId, // Use manufacturerId if set
          availableStock,
          reservedStock,
          stockStatus: availableStock <= 0 ? 'out_of_stock' : availableStock < 10 ? 'low_stock' : 'in_stock',
        };
      })
    );

    console.log(`✅ [getManufacturerProductsForRestock] Products with availability calculated: ${productsWithAvailability.length}`);

    // Filter to only products with availability > 0
    const filtered = productsWithAvailability.filter((p) => p.availableStock > 0);
    console.log(`🎯 [getManufacturerProductsForRestock] After filtering (availableStock > 0): ${filtered.length} products`);

    // If no products with availability > 0, return all products anyway so retailers can see what's available
    if (filtered.length === 0 && productsWithAvailability.length > 0) {
      console.log(`⚠️ [getManufacturerProductsForRestock] No products with availability > 0, returning all ${productsWithAvailability.length} products anyway`);
      return productsWithAvailability;
    }

    return filtered;
  }

  // Get all available manufacturer products for a retailer to browse
  async getAllAvailableManufacturerProducts(retailerId: string) {
    console.log(`🔍 [getAllAvailableManufacturerProducts] Fetching for retailer: ${retailerId}`);
    
    // First, get all manufacturer profile IDs
    const manufacturerProfiles = await this.prisma.profile.findMany({
      where: {
        role: 'manufacturer',
      },
      select: {
        id: true,
        businessName: true,
        email: true,
      },
    });

    const manufacturerIds = manufacturerProfiles.map(p => p.id);
    console.log(`🏭 [getAllAvailableManufacturerProducts] Found ${manufacturerIds.length} manufacturer profiles:`, manufacturerProfiles);

    if (manufacturerIds.length === 0) {
      console.log(`⚠️ [getAllAvailableManufacturerProducts] No manufacturers found in system`);
      return [];
    }

    // Debug: Check all products with manufacturer role or retailerId in manufacturer list
    const allProductsCheck = await this.prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        retailerId: true,
        createdByRole: true,
        stockQuantity: true,
      },
      take: 10,
    });
    console.log(`🔍 [getAllAvailableManufacturerProducts] Sample of all active products:`, allProductsCheck);

    // Debug: Check products with manufacturerId set
    const manufacturerProductsCheck = await this.prisma.product.findMany({
      where: {
        isActive: true,
        manufacturerId: { not: null },
      },
      select: {
        id: true,
        name: true,
        retailerId: true,
        manufacturerId: true,
        createdByRole: true,
        stockQuantity: true,
      },
    });
    console.log(`🔍 [getAllAvailableManufacturerProducts] Products with manufacturerId set:`, manufacturerProductsCheck.length, manufacturerProductsCheck);

    // Get all active manufacturer products
    // Manufacturer products are identified by manufacturerId field (not retailerId)
    const whereClause: any = {
      isActive: true,
      manufacturerId: { 
        not: null,
        in: manufacturerIds, // manufacturerId must be in the list of manufacturer profile IDs
      },
      // Exclude products where retailerId matches the current retailer (their own products)
      NOT: {
        retailerId: retailerId,
      },
    };

    console.log(`🔍 [getAllAvailableManufacturerProducts] Query where clause:`, JSON.stringify(whereClause, null, 2));

    let manufacturerProducts = await this.prisma.product.findMany({
      where: whereClause,
      include: {
        retailer: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
            phone: true,
            role: true, // Add role to verify
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`📦 [getAllAvailableManufacturerProducts] Found ${manufacturerProducts.length} manufacturer products before availability calculation`);

    // Calculate available stock for each product and fetch manufacturer info
    const productsWithAvailability = await Promise.all(
      manufacturerProducts.map(async (product) => {
        const reservedStock = await this.manufacturerOrdersService.calculateReservedStock(product.id);
        const availableStock = Math.max(0, product.stockQuantity - reservedStock);

        // Fetch manufacturer profile using manufacturerId
        let manufacturer = null;
        if (product.manufacturerId) {
          manufacturer = await this.prisma.profile.findUnique({
            where: { id: product.manufacturerId },
            select: {
              id: true,
              fullName: true,
              businessName: true,
              email: true,
              phone: true,
            },
          });
        }

        console.log(`📊 [getAllAvailableManufacturerProducts] Product ${product.id} (${product.name}): stock=${product.stockQuantity}, reserved=${reservedStock}, available=${availableStock}, manufacturerId=${product.manufacturerId}`);

        return {
          ...product,
          manufacturer: manufacturer || product.retailer, // Use manufacturer profile if available, fallback to retailer
          manufacturerId: product.manufacturerId || product.retailerId, // Use manufacturerId if set
          availableStock,
          reservedStock,
          stockStatus: availableStock <= 0 ? 'out_of_stock' : availableStock < 10 ? 'low_stock' : 'in_stock',
        };
      })
    );

    console.log(`✅ [getAllAvailableManufacturerProducts] Products with availability calculated: ${productsWithAvailability.length}`);

    // Log each product's availability for debugging
    productsWithAvailability.forEach((p, i) => {
      console.log(`   Product ${i + 1}: ${p.name} - Available: ${p.availableStock}, Status: ${p.stockStatus}`);
    });

    // Filter to only products with availability > 0
    const filtered = productsWithAvailability.filter((p) => p.availableStock > 0);
    console.log(`🎯 [getAllAvailableManufacturerProducts] After filtering (availableStock > 0): ${filtered.length} products`);

    // If no products with availability > 0, return all products anyway so retailers can see what's out of stock
    // This helps them know what products exist even if currently unavailable
    if (filtered.length === 0 && productsWithAvailability.length > 0) {
      console.log(`⚠️ [getAllAvailableManufacturerProducts] No products with availability > 0, returning all ${productsWithAvailability.length} products anyway`);
      return productsWithAvailability;
    }

    console.log(`📤 [getAllAvailableManufacturerProducts] Returning ${filtered.length} products to frontend`);
    return filtered;
  }
}
