import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import { CreateProductCategoryDto } from "./dto/create-product-category.dto"
import { UpdateProductCategoryDto } from "./dto/update-product-category.dto"

@Injectable()
export class ProductCategoriesService {
  constructor(private prisma: PrismaService) {}

  async createProductCategory(
    createProductCategoryDto: CreateProductCategoryDto
  ) {
    console.log("🔍 Debug - Backend createProductCategory called with:", createProductCategoryDto)
    
    // Generate slug from name
    const slug = createProductCategoryDto.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")

    // Check if slug already exists
    const existingCategory = await this.prisma.productCategory.findUnique({
      where: { slug },
    })

    if (existingCategory) {
      throw new BadRequestException("A category with this name already exists")
    }

    // Validate parent category if provided
    if (createProductCategoryDto.parentId) {
      const parentCategory = await this.prisma.productCategory.findUnique({
        where: { id: createProductCategoryDto.parentId },
      })

      if (!parentCategory) {
        throw new NotFoundException("Parent category not found")
      }

      // Ensure parent is level 1 if creating level 2 category
      if (createProductCategoryDto.level === 2 && parentCategory.level !== 1) {
        throw new BadRequestException(
          "Parent category must be level 1 for subcategories"
        )
      }
    }

    return this.prisma.productCategory.create({
      data: {
        ...createProductCategoryDto,
        slug,
        isActive: createProductCategoryDto.isActive ?? true,
      },
      include: {
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
          orderBy: { position: "asc" },
        },
      },
    })
  }

  async getAllProductCategories() {
    return this.prisma.productCategory.findMany({
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
          orderBy: { position: "asc" },
        },
      },
      orderBy: [{ level: "asc" }, { position: "asc" }],
    })
  }

  async getActiveProductCategories() {
    // Optimize query by removing nested relations that can be computed on frontend
    // This reduces database connection pool usage
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
        showOnHomepage: true,
        createdAt: true,
        updatedAt: true,
        // Removed parent and children relations to reduce query complexity
        // Frontend can compute these relationships from the flat list
      },
      orderBy: [{ level: "asc" }, { position: "asc" }],
    })
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
          orderBy: { position: "asc" },
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
    })

    if (!category) {
      throw new NotFoundException("Product category not found")
    }

    return category
  }

  async updateProductCategory(
    id: string,
    updateProductCategoryDto: UpdateProductCategoryDto
  ) {
    const category = await this.getProductCategoryById(id)

    const updateData: any = { ...updateProductCategoryDto }

    // Generate new slug if name is being updated
    if (updateProductCategoryDto.name) {
      const slug = updateProductCategoryDto.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")

      // Check if new slug already exists (excluding current category)
      const existingCategory = await this.prisma.productCategory.findFirst({
        where: {
          slug,
          id: { not: id },
        },
      })

      if (existingCategory) {
        throw new BadRequestException(
          "A category with this name already exists"
        )
      }

      updateData.slug = slug
    }

    // Validate parent category if being updated
    if (updateProductCategoryDto.parentId !== undefined) {
      if (updateProductCategoryDto.parentId) {
        const parentCategory = await this.prisma.productCategory.findUnique({
          where: { id: updateProductCategoryDto.parentId },
        })

        if (!parentCategory) {
          throw new NotFoundException("Parent category not found")
        }

        // Ensure parent is level 1 if this is level 2 category
        const currentLevel = updateProductCategoryDto.level ?? category.level
        if (currentLevel === 2 && parentCategory.level !== 1) {
          throw new BadRequestException(
            "Parent category must be level 1 for subcategories"
          )
        }
      } else {
        // Setting parentId to null
        updateData.parentId = null
      }
    }

    return this.prisma.productCategory.update({
      where: { id },
      data: updateData,
      include: {
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
          orderBy: { position: "asc" },
        },
      },
    })
  }

  // Helper method to get all descendants of a category using recursive CTE
  private async getAllDescendants(parentId: string): Promise<any[]> {
    // Use raw SQL with recursive CTE for better performance
    const result = await this.prisma.$queryRaw`
      WITH RECURSIVE descendants AS (
        SELECT id, level, parent_id
        FROM product_categories 
        WHERE parent_id = ${parentId}
        
        UNION ALL
        
        SELECT pc.id, pc.level, pc.parent_id
        FROM product_categories pc
        INNER JOIN descendants d ON pc.parent_id = d.id
      )
      SELECT id, level FROM descendants
    ` as { id: string; level: number }[]
    
    return result
  }

  async deleteProductCategory(id: string, recursive: boolean = false) {
    const category = await this.getProductCategoryById(id)

    // Check if category has children
    const childrenCount = await this.prisma.productCategory.count({
      where: { parentId: id },
    })

    if (childrenCount > 0 && !recursive) {
      throw new BadRequestException(
        "Cannot delete category with subcategories. Please delete subcategories first or use recursive deletion."
      )
    }

    // Check if category has products
    const productsCount = await this.prisma.product.count({
      where: {
        OR: [{ categoryId: id }, { subcategoryId: id }],
      },
    })

    if (productsCount > 0) {
      throw new BadRequestException(
        "Cannot delete category with products. Please move or delete products first."
      )
    }

    // If recursive deletion is enabled, delete all children first
    if (recursive && childrenCount > 0) {
      // Get all descendants in a single query
      const allDescendants = await this.getAllDescendants(id)
      
      if (allDescendants.length > 0) {
        // Use bulk deletion for better performance
        const descendantIds = allDescendants.map(desc => desc.id)
        
        // Delete all descendants in a single transaction
        await this.prisma.productCategory.deleteMany({
          where: {
            id: {
              in: descendantIds
            }
          }
        })
      }
    }

    return this.prisma.productCategory.delete({
      where: { id },
    })
  }

  async getProductCategoriesByLevel(level: number) {
    return this.prisma.productCategory.findMany({
      where: {
        level,
        isActive: true,
      },
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
          orderBy: { position: "asc" },
        },
      },
      orderBy: { position: "asc" },
    })
  }

  async getChildCategories(parentId: string) {
    return this.prisma.productCategory.findMany({
      where: {
        parentId,
        isActive: true,
      },
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
          orderBy: { position: "asc" },
        },
      },
      orderBy: { position: "asc" },
    })
  }

  async getRootCategories() {
    return this.prisma.productCategory.findMany({
      where: {
        level: 1,
        isActive: true,
      },
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
          orderBy: { position: "asc" },
        },
      },
      orderBy: { position: "asc" },
    })
  }

  async getProductCategoryStats() {
    const [total, active, inactive, level1, level2] = await Promise.all([
      this.prisma.productCategory.count(),
      this.prisma.productCategory.count({ where: { isActive: true } }),
      this.prisma.productCategory.count({ where: { isActive: false } }),
      this.prisma.productCategory.count({ where: { level: 1 } }),
      this.prisma.productCategory.count({ where: { level: 2 } }),
    ])

    return {
      total,
      active,
      inactive,
      level1,
      level2,
    }
  }
}
