import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { user_role, onboarding_status } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { OnboardingService } from '../onboarding/onboarding.service';
import { CartCleanupService } from '../cart/cart-cleanup.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private onboardingService: OnboardingService,
    private cartCleanupService: CartCleanupService
  ) {}

  async findById(id: string) {
    const user = await this.prisma.profile.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        businessName: true,
        businessDescription: true,
        businessAddress: true,
        businessPhone: true,
        isVerified: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedBy: true,
        suspensionReason: true,
        onboardingStatus: true,
        paymentAccountDetails: true,
        paymentAccountType: true,
        paymentDetailsVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async findByEmail(email: string) {
    return this.prisma.profile.findUnique({
      where: { email },
    });
  }

  async updateProfile(id: string, updateData: UpdateProfileDto) {
    return this.prisma.profile.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        businessName: true,
        businessDescription: true,
        businessAddress: true,
        businessPhone: true,
        isVerified: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedBy: true,
        suspensionReason: true,
        onboardingStatus: true,
        paymentAccountDetails: true,
        paymentAccountType: true,
        paymentDetailsVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getAllUsers(role?: user_role) {
    const where = role ? { role } : {};
    
    const users = await this.prisma.profile.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        businessName: true,
        businessDescription: true,
        businessAddress: true,
        businessPhone: true,
        isVerified: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedBy: true,
        suspensionReason: true,
        onboardingStatus: true,
        paymentAccountDetails: true,
        paymentAccountType: true,
        paymentDetailsVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  async verifyUser(id: string) {
    return this.prisma.profile.update({
      where: { id },
      data: { isVerified: true },
    });
  }

  async deleteUser(id: string) {
    try {
      console.log('🗑️ [USER_DELETE] Starting user deletion process for user:', id);
      
      // First, check if user exists
      const user = await this.prisma.profile.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          businessName: true
        }
      });

      if (!user) {
        console.log('⚠️ [USER_DELETE] User not found:', id);
        throw new NotFoundException('User not found');
      }

      console.log('👤 [USER_DELETE] User found:', {
        id: user.id,
        email: user.email,
        name: user.fullName || user.businessName,
        role: user.role
      });

      // Count related data before deletion
      const [productCount, serviceCount, orderCount, wishlistCount, cartCount] = await Promise.all([
        this.prisma.product.count({ where: { retailerId: id } }),
        this.prisma.service.count({ where: { vendorId: id } }),
        this.prisma.order.count({ where: { userId: id } }),
        this.prisma.wishlist.count({ where: { userId: id } }),
        this.prisma.wishlist.count({ where: { 
          OR: [
            { product: { retailerId: id } },
            { service: { vendorId: id } }
          ]
        }})
      ]);

      console.log('📊 [USER_DELETE] Related data counts:');
      console.log(`  - Products: ${productCount}`);
      console.log(`  - Services: ${serviceCount}`);
      console.log(`  - Orders: ${orderCount}`);
      console.log(`  - User wishlist items: ${wishlistCount}`);
      console.log(`  - Cart items from deleted products/services: ${cartCount}`);

      // Get list of product/service IDs that will be deleted for cart cleanup
      const [deletedProductIds, deletedServiceIds] = await Promise.all([
        this.prisma.product.findMany({ 
          where: { retailerId: id },
          select: { id: true }
        }),
        this.prisma.service.findMany({ 
          where: { vendorId: id },
          select: { id: true }
        })
      ]);

      // Clean up cart items before deletion
      if (deletedProductIds.length > 0 || deletedServiceIds.length > 0) {
        await this.cartCleanupService.cleanupDeletedItems(
          deletedProductIds.map(p => p.id), 
          deletedServiceIds.map(s => s.id)
        );
      }

      // Delete user (cascading deletes will handle products, services, etc.)
      const deletedUser = await this.prisma.profile.delete({
        where: { id },
      });

      console.log('✅ [USER_DELETE] User and all related data deleted successfully');
      console.log('🗑️ [USER_DELETE] Cascading deletes handled:');
      console.log(`  - ${productCount} products deleted`);
      console.log(`  - ${serviceCount} services deleted`);
      console.log(`  - All related orders, appointments, reviews, etc. deleted`);

      return {
        success: true,
        message: 'User and all related data deleted successfully',
        deletedUser: {
          id: deletedUser.id,
          email: deletedUser.email,
          name: deletedUser.fullName || deletedUser.businessName
        },
        deletedData: {
          products: productCount,
          services: serviceCount,
          orders: orderCount,
          wishlistItems: wishlistCount,
          cartItems: cartCount
        },
        deletedProductIds: deletedProductIds.map(p => p.id),
        deletedServiceIds: deletedServiceIds.map(s => s.id)
      };
    } catch (error) {
      console.error('❌ [USER_DELETE] Error deleting user:', error);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async createUser(createData: CreateUserDto) {
    // Check if user already exists
    const existingUser = await this.findByEmail(createData.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const password = createData.fullName.toLowerCase().trim() + '@123';
    const hashedPassword = await this.hashPassword(password);

    return this.prisma.profile.create({
      data: {
        email: createData.email,
        password: hashedPassword,
        fullName: createData.fullName,
        phone: createData.phone,
        role: createData.role || user_role.client,
        businessName: createData.businessName,
        businessDescription: createData.businessDescription,
        businessAddress: createData.businessAddress,
        businessPhone: createData.businessPhone,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        businessName: true,
        businessDescription: true,
        businessAddress: true,
        businessPhone: true,
        isVerified: true,
        isSuspended: true,
        onboardingStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async suspendUser(id: string, suspendedBy: string, reason: string) {
    return this.prisma.profile.update({
      where: { id },
      data: {
        isSuspended: true,
        suspendedAt: new Date(),
        suspendedBy,
        suspensionReason: reason,
      },
    });
  }

  async unsuspendUser(id: string) {
    return this.prisma.profile.update({
      where: { id },
      data: {
        isSuspended: false,
        suspendedAt: null,
        suspendedBy: null,
        suspensionReason: null,
      },
    });
  }

  async updateOnboardingStatus(id: string, status: onboarding_status, adminId?: string, notes?: string, rejectionReason?: string) {
    // Use the onboarding service which handles email notifications
    const result = await this.onboardingService.updateUserOnboardingStatus(
      id, 
      status, 
      adminId || 'system', 
      notes, 
      rejectionReason
    );
    
    return result.user;
  }

  async updatePaymentDetails(id: string, paymentAccountDetails: any, paymentAccountType: string) {
    return this.prisma.profile.update({
      where: { id },
      data: {
        paymentAccountDetails,
        paymentAccountType,
        paymentDetailsVerified: false, // Reset verification status when details change
      },
    });
  }

  async verifyPaymentDetails(id: string) {
    return this.prisma.profile.update({
      where: { id },
      data: { paymentDetailsVerified: true },
    });
  }

  async getUsersByRole(role: user_role) {
    return this.getAllUsers(role);
  }

  async getSuspendedUsers() {
    const users = await this.prisma.profile.findMany({
      where: { isSuspended: true },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        businessName: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedBy: true,
        suspensionReason: true,
        createdAt: true,
      },
      orderBy: { suspendedAt: 'desc' },
    });

    return users;
  }

  async getUsersByOnboardingStatus(status: onboarding_status) {
    const users = await this.prisma.profile.findMany({
      where: { onboardingStatus: status },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        businessName: true,
        onboardingStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  async getUnverifiedUsers(limit?: number) {
    const queryOptions: any = {
      where: { isVerified: false },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        businessName: true,
        businessDescription: true,
        businessAddress: true,
        businessPhone: true,
        isVerified: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedBy: true,
        suspensionReason: true,
        onboardingStatus: true,
        paymentAccountDetails: true,
        paymentAccountType: true,
        paymentDetailsVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    };

    if (limit && limit > 0) {
      queryOptions.take = limit;
    }

    console.log('queryOptions*******************************', this.prisma.profile.findMany(queryOptions));

    return this.prisma.profile.findMany(queryOptions);
  }
}
