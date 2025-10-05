import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';

@Injectable()
export class ServiceCategoriesService {
  constructor(private prisma: PrismaService) {}

  async createServiceCategory(createServiceCategoryDto: CreateServiceCategoryDto) {
    // Generate slug from name
    const slug = createServiceCategoryDto.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Check if slug already exists
    const existingCategory = await this.prisma.serviceCategory.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      throw new BadRequestException('A category with this name already exists');
    }

    // Validate parent category if provided
    if (createServiceCategoryDto.parentId) {
      const parentCategory = await this.prisma.serviceCategory.findUnique({
        where: { id: createServiceCategoryDto.parentId },
      });

      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }

      // Ensure proper level hierarchy
      if (createServiceCategoryDto.level === 2 && parentCategory.level !== 1) {
        throw new BadRequestException('Parent category must be level 1 for level 2 categories');
      }
      if (createServiceCategoryDto.level === 3 && parentCategory.level !== 2) {
        throw new BadRequestException('Parent category must be level 2 for level 3 categories');
      }
    }

    return this.prisma.serviceCategory.create({
      data: {
        ...createServiceCategoryDto,
        slug,
        isActive: createServiceCategoryDto.isActive ?? true,
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
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async getAllServiceCategories() {
    return this.prisma.serviceCategory.findMany({
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

  async getActiveServiceCategories() {
    return this.prisma.serviceCategory.findMany({
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

  async getServiceCategoryById(id: string) {
    const category = await this.prisma.serviceCategory.findUnique({
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
        services: {
          select: {
            id: true,
            name: true,
            price: true,
            imageUrl: true,
            isActive: true,
          },
          where: { isActive: true },
          take: 10, // Limit to first 10 services for preview
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Service category not found');
    }

    return category;
  }

  async updateServiceCategory(id: string, updateServiceCategoryDto: UpdateServiceCategoryDto) {
    const category = await this.getServiceCategoryById(id);

    const updateData: any = { ...updateServiceCategoryDto };

    // Generate new slug if name is being updated
    if (updateServiceCategoryDto.name) {
      const slug = updateServiceCategoryDto.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      // Check if new slug already exists (excluding current category)
      const existingCategory = await this.prisma.serviceCategory.findFirst({
        where: { 
          slug,
          id: { not: id },
        },
      });

      if (existingCategory) {
        throw new BadRequestException('A category with this name already exists');
      }

      updateData.slug = slug;
    }

    // Validate parent category if being updated
    if (updateServiceCategoryDto.parentId !== undefined) {
      if (updateServiceCategoryDto.parentId) {
        const parentCategory = await this.prisma.serviceCategory.findUnique({
          where: { id: updateServiceCategoryDto.parentId },
        });

        if (!parentCategory) {
          throw new NotFoundException('Parent category not found');
        }

        // Ensure proper level hierarchy
        const currentLevel = updateServiceCategoryDto.level ?? category.level;
        if (currentLevel === 2 && parentCategory.level !== 1) {
          throw new BadRequestException('Parent category must be level 1 for level 2 categories');
        }
        if (currentLevel === 3 && parentCategory.level !== 2) {
          throw new BadRequestException('Parent category must be level 2 for level 3 categories');
        }
      } else {
        // Setting parentId to null
        updateData.parentId = null;
      }
    }

    return this.prisma.serviceCategory.update({
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
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  // Helper method to get all descendants of a service category using recursive CTE
  private async getAllServiceDescendants(parentId: string): Promise<any[]> {
    // Use raw SQL with recursive CTE for better performance
    const result = await this.prisma.$queryRaw`
      WITH RECURSIVE descendants AS (
        SELECT id, level, parent_id
        FROM service_categories 
        WHERE parent_id = ${parentId}
        
        UNION ALL
        
        SELECT sc.id, sc.level, sc.parent_id
        FROM service_categories sc
        INNER JOIN descendants d ON sc.parent_id = d.id
      )
      SELECT id, level FROM descendants
    ` as { id: string; level: number }[]
    
    return result
  }

  async deleteServiceCategory(id: string, recursive: boolean = false) {
    const category = await this.getServiceCategoryById(id);

    // Check if category has children
    const childrenCount = await this.prisma.serviceCategory.count({
      where: { parentId: id },
    });

    if (childrenCount > 0 && !recursive) {
      throw new BadRequestException('Cannot delete category with subcategories. Please delete subcategories first or use recursive deletion.');
    }

    // Check if category has services
    const servicesCount = await this.prisma.service.count({
      where: {
        OR: [
          { categoryId: id },
          { subcategoryId: id },
          { actualServiceId: id },
        ],
      },
    });

    if (servicesCount > 0) {
      throw new BadRequestException('Cannot delete category with services. Please move or delete services first.');
    }

    // If recursive deletion is enabled, delete all children first
    if (recursive && childrenCount > 0) {
      // Get all descendants in a single query
      const allDescendants = await this.getAllServiceDescendants(id);
      
      if (allDescendants.length > 0) {
        // Use bulk deletion for better performance
        const descendantIds = allDescendants.map(desc => desc.id);
        
        // Delete all descendants in a single transaction
        await this.prisma.serviceCategory.deleteMany({
          where: {
            id: {
              in: descendantIds
            }
          }
        });
      }
    }

    return this.prisma.serviceCategory.delete({
      where: { id },
    });
  }

  async getServiceCategoriesByLevel(level: number) {
    return this.prisma.serviceCategory.findMany({
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
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });
  }

  async getChildCategories(parentId: string) {
    return this.prisma.serviceCategory.findMany({
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
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });
  }

  async getRootCategories() {
    return this.prisma.serviceCategory.findMany({
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
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });
  }

  async getServiceCategoryStats() {
    const [
      total,
      active,
      inactive,
      level1,
      level2,
      level3,
    ] = await Promise.all([
      this.prisma.serviceCategory.count(),
      this.prisma.serviceCategory.count({ where: { isActive: true } }),
      this.prisma.serviceCategory.count({ where: { isActive: false } }),
      this.prisma.serviceCategory.count({ where: { level: 1 } }),
      this.prisma.serviceCategory.count({ where: { level: 2 } }),
      this.prisma.serviceCategory.count({ where: { level: 3 } }),
    ]);

    return {
      total,
      active,
      inactive,
      level1,
      level2,
      level3,
    };
  }
}
