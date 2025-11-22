import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { user_role } from '@prisma/client';
import { CreateServiceDto, UpdateServiceDto, CreateStaffDto, UpdateStaffDto } from './dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async createService(userId: string, userRole: user_role, createServiceDto: CreateServiceDto) {
    // Only vendors can create services
    if (userRole !== user_role.vendor) {
      throw new ForbiddenException('Only vendors can create services');
    }

    const serviceData: any = {
      name: createServiceDto.name,
      description: createServiceDto.description,
      price: createServiceDto.price,
      currency: createServiceDto.currency || 'USD',
      durationMinutes: createServiceDto.durationMinutes,
      imageUrl: createServiceDto.imageUrl,
      category: createServiceDto.category,
      categoryId: createServiceDto.categoryId,
      subcategoryId: createServiceDto.subcategoryId,
      actualServiceId: createServiceDto.actualServiceId,
      deliveryMethod: createServiceDto.deliveryMethod,
      tags: createServiceDto.tags || [],
      metadata: createServiceDto.metadata,
      vendorId: userId,
    };

    const service = await this.prisma.service.create({
      data: serviceData,
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
    });

    // Convert Decimal price to number for proper frontend handling
    return {
      ...service,
      price: Number(service.price)
    };
  }

  async getAllServices(category?: string, isActive = true) {
    const where: any = { isActive };
    if (category) {
      where.category = category;
    }
    
    const services = await this.prisma.service.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Convert Decimal price to number for proper frontend handling
    return services.map(service => ({
      ...service,
      price: Number(service.price)
    }));
  }

  async getServiceById(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Convert Decimal price to number for proper frontend handling
    return {
      ...service,
      price: Number(service.price)
    };
  }

  async updateService(id: string, userId: string, userRole: user_role, updateServiceDto: UpdateServiceDto) {
    const service = await this.getServiceById(id);

    // Only the service owner or admin can update
    if (service.vendorId !== userId && userRole !== user_role.admin) {
      throw new ForbiddenException('You can only update your own services');
    }

    // Filter out undefined values and map field names
    const updateData: any = {};
    if (updateServiceDto.name !== undefined) updateData.name = updateServiceDto.name;
    if (updateServiceDto.description !== undefined) updateData.description = updateServiceDto.description;
    if (updateServiceDto.price !== undefined) updateData.price = updateServiceDto.price;
    if (updateServiceDto.currency !== undefined) updateData.currency = updateServiceDto.currency;
    if (updateServiceDto.durationMinutes !== undefined) updateData.durationMinutes = updateServiceDto.durationMinutes;
    if (updateServiceDto.imageUrl !== undefined) updateData.imageUrl = updateServiceDto.imageUrl;
    if (updateServiceDto.category !== undefined) updateData.category = updateServiceDto.category;
    if (updateServiceDto.categoryId !== undefined) updateData.categoryId = updateServiceDto.categoryId;
    if (updateServiceDto.subcategoryId !== undefined) updateData.subcategoryId = updateServiceDto.subcategoryId;
    if (updateServiceDto.actualServiceId !== undefined) updateData.actualServiceId = updateServiceDto.actualServiceId;
    if (updateServiceDto.deliveryMethod !== undefined) updateData.deliveryMethod = updateServiceDto.deliveryMethod;
    if (updateServiceDto.tags !== undefined) updateData.tags = updateServiceDto.tags;
    if (updateServiceDto.metadata !== undefined) updateData.metadata = updateServiceDto.metadata;
    if (updateServiceDto.isActive !== undefined) updateData.isActive = updateServiceDto.isActive;

    const updatedService = await this.prisma.service.update({
      where: { id },
      data: updateData,
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
    });

    // Convert Decimal price to number for proper frontend handling
    return {
      ...updatedService,
      price: Number(updatedService.price)
    };
  }

  async deleteService(id: string, userId: string, userRole: user_role) {
    const service = await this.getServiceById(id);

    // Only the service owner or admin can delete
    if (service.vendorId !== userId && userRole !== user_role.admin) {
      throw new ForbiddenException('You can only delete your own services');
    }

    return this.prisma.service.delete({
      where: { id },
    });
  }

  async getUserServices(userId: string) {
    // Ensure we're filtering by the correct vendor ID
    const services = await this.prisma.service.findMany({
      where: { 
        vendorId: userId, // Only get services for this specific vendor
      },
      include: {
        serviceCategory: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        serviceSubcategory: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Log for debugging
    console.log(`[ServicesService] getUserServices for userId: ${userId}, found ${services.length} services`);
    if (services.length > 0) {
      console.log(`[ServicesService] Sample service vendor IDs:`, services.slice(0, 3).map(s => s.vendorId));
    }

    return services;
  }

  async getServicesByCategory(category: string) {
    const services = await this.prisma.service.findMany({
      where: { 
        category,
        isActive: true,
      },
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return services;
  }

  async getServicesByCategoryId(categoryId: string) {
    const services = await this.prisma.service.findMany({
      where: { 
        categoryId,
        isActive: true,
      },
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
        serviceCategory: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return services;
  }

  async searchServices(query: string) {
    const services = await this.prisma.service.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { category: { contains: query, mode: 'insensitive' } },
              { deliveryMethod: { contains: query, mode: 'insensitive' } },
              { tags: { has: query } },
            ],
          },
        ],
      },
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return services;
  }

  async getServicesByDeliveryMethod(deliveryMethod: string) {
    const services = await this.prisma.service.findMany({
      where: { 
        deliveryMethod,
        isActive: true,
      },
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return services;
  }

  async getServicesByPriceRange(minPrice: number, maxPrice: number) {
    const services = await this.prisma.service.findMany({
      where: { 
        price: {
          gte: minPrice,
          lte: maxPrice,
        },
        isActive: true,
      },
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
      orderBy: { price: 'asc' },
    });

    return services;
  }

  async getServicesByDuration(maxDurationMinutes: number) {
    const services = await this.prisma.service.findMany({
      where: { 
        durationMinutes: {
          lte: maxDurationMinutes,
        },
        isActive: true,
      },
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
      orderBy: { durationMinutes: 'asc' },
    });

    return services;
  }

  async getServicesByTags(tags: string[]) {
    const services = await this.prisma.service.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            tags: {
              hasSome: tags,
            },
          },
        ],
      },
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return services;
  }

  // Staff Management Methods
  async createStaff(userId: string, userRole: user_role, createStaffDto: CreateStaffDto) {
    // Only vendors can create staff
    if (userRole !== user_role.vendor) {
      throw new ForbiddenException('Only vendors can create staff');
    }

    const staffData = {
      name: createStaffDto.name,
      bio: createStaffDto.bio,
      imageUrl: createStaffDto.imageUrl,
      specialties: createStaffDto.specialties || [],
      isActive: createStaffDto.isActive !== undefined ? createStaffDto.isActive : true,
      vendorId: userId,
    };

    return this.prisma.staff.create({
      data: staffData,
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
    });
  }

  async getAllStaff(vendorId?: string, isActive = true) {
    const where: any = { isActive };
    if (vendorId) {
      where.vendorId = vendorId;
    }

    return this.prisma.staff.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStaffById(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    return staff;
  }

  async updateStaff(id: string, userId: string, userRole: user_role, updateStaffDto: UpdateStaffDto) {
    // Only vendors can update staff
    if (userRole !== user_role.vendor) {
      throw new ForbiddenException('Only vendors can update staff');
    }

    // Check if staff exists and belongs to the vendor
    const existingStaff = await this.prisma.staff.findUnique({
      where: { id },
    });

    if (!existingStaff) {
      throw new NotFoundException('Staff member not found');
    }

    if (existingStaff.vendorId !== userId) {
      throw new ForbiddenException('You can only update your own staff members');
    }

    const updateData: any = {};
    if (updateStaffDto.name !== undefined) updateData.name = updateStaffDto.name;
    if (updateStaffDto.bio !== undefined) updateData.bio = updateStaffDto.bio;
    if (updateStaffDto.imageUrl !== undefined) updateData.imageUrl = updateStaffDto.imageUrl;
    if (updateStaffDto.specialties !== undefined) updateData.specialties = updateStaffDto.specialties;
    if (updateStaffDto.isActive !== undefined) updateData.isActive = updateStaffDto.isActive;

    return this.prisma.staff.update({
      where: { id },
      data: updateData,
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
    });
  }

  async deleteStaff(id: string, userId: string, userRole: user_role) {
    // Only vendors can delete staff
    if (userRole !== user_role.vendor) {
      throw new ForbiddenException('Only vendors can delete staff');
    }

    // Check if staff exists and belongs to the vendor
    const existingStaff = await this.prisma.staff.findUnique({
      where: { id },
    });

    if (!existingStaff) {
      throw new NotFoundException('Staff member not found');
    }

    if (existingStaff.vendorId !== userId) {
      throw new ForbiddenException('You can only delete your own staff members');
    }

    return this.prisma.staff.delete({
      where: { id },
    });
  }

  async getStaffByVendorId(vendorId: string, isActive = true) {
    return this.prisma.staff.findMany({
      where: {
        vendorId,
        isActive,
      },
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async searchStaff(query: string, vendorId?: string) {
    const where: any = {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { bio: { contains: query, mode: 'insensitive' } },
        { specialties: { has: query } },
      ],
    };

    if (vendorId) {
      where.vendorId = vendorId;
    }

    return this.prisma.staff.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStaffBySpecialties(specialties: string[], vendorId?: string) {
    const where: any = {
      isActive: true,
      specialties: {
        hasSome: specialties,
      },
    };

    if (vendorId) {
      where.vendorId = vendorId;
    }

    return this.prisma.staff.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
