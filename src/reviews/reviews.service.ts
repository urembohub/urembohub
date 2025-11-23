import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { CreateUserReviewDto } from './dto/create-user-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  // Get all reviews with filtering and pagination
  async getAllReviews(
    page: number = 1,
    limit: number = 10,
    serviceId?: string,
    vendorId?: string,
    clientId?: string,
    minRating?: number,
    maxRating?: number
  ) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (serviceId) where.serviceId = serviceId;
    if (vendorId) where.vendorId = vendorId;
    if (clientId) where.clientId = clientId;
    if (minRating !== undefined || maxRating !== undefined) {
      where.rating = {};
      if (minRating !== undefined) where.rating.gte = minRating;
      if (maxRating !== undefined) where.rating.lte = maxRating;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.serviceReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              currency: true,
              imageUrl: true,
            },
          },
          appointment: {
            select: {
              id: true,
              appointmentDate: true,
              status: true,
            },
          },
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          vendor: {
            select: {
              id: true,
              fullName: true,
              businessName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.serviceReview.count({ where }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get review by ID
  async getReviewById(id: string) {
    const review = await this.prisma.serviceReview.findUnique({
      where: { id },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            currency: true,
            imageUrl: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            status: true,
          },
        },
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        vendor: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  // Create new review
  async createReview(createReviewDto: CreateReviewDto, userId: string) {
    const {
      serviceId,
      appointmentId,
      clientId,
      vendorId,
      staffId,
      rating,
      reviewText,
    } = createReviewDto;

    // Validate service exists
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      throw new BadRequestException('Invalid service ID');
    }

    // Validate appointment exists
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new BadRequestException('Invalid appointment ID');
    }

    // Validate client exists
    const client = await this.prisma.profile.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      throw new BadRequestException('Invalid client ID');
    }

    // Validate vendor exists
    const vendor = await this.prisma.profile.findUnique({
      where: { id: vendorId },
    });
    if (!vendor) {
      throw new BadRequestException('Invalid vendor ID');
    }

    // Validate staff exists if provided
    if (staffId) {
      const staff = await this.prisma.staff.findUnique({
        where: { id: staffId },
      });
      if (!staff) {
        throw new BadRequestException('Invalid staff ID');
      }
    }

    // Check if review already exists for this appointment
    const existingReview = await this.prisma.serviceReview.findFirst({
      where: {
        appointmentId,
        clientId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('Review already exists for this appointment');
    }

    // Check if appointment is completed
    if (appointment.status !== 'completed') {
      throw new BadRequestException('Can only review completed appointments');
    }

    // Check if client is the one who made the appointment
    if (appointment.clientId !== clientId) {
      throw new BadRequestException('You can only review your own appointments');
    }

    const review = await this.prisma.serviceReview.create({
      data: {
        serviceId,
        appointmentId,
        clientId,
        vendorId,
        staffId,
        rating,
        reviewText,
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            currency: true,
            imageUrl: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            status: true,
          },
        },
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        vendor: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
          },
        },
      },
    });

    return review;
  }

  // Update review
  async updateReview(id: string, updateReviewDto: UpdateReviewDto, userId: string) {
    const review = await this.getReviewById(id);

    // Check permissions - only the client who wrote the review can update it
    if (review.clientId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updatedReview = await this.prisma.serviceReview.update({
      where: { id },
      data: updateReviewDto,
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            currency: true,
            imageUrl: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            status: true,
          },
        },
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        vendor: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
          },
        },
      },
    });

    return updatedReview;
  }

  // Delete review
  async deleteReview(id: string, userId: string, userRole: string) {
    const review = await this.getReviewById(id);

    // Check permissions - only the client who wrote the review or admin can delete it
    if (userRole !== 'admin' && review.clientId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.serviceReview.delete({
      where: { id },
    });

    return { message: 'Review deleted successfully' };
  }

  // Get reviews by service ID
  async getReviewsByServiceId(serviceId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.serviceReview.findMany({
        where: { serviceId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          appointment: {
            select: {
              id: true,
              appointmentDate: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.serviceReview.count({ where: { serviceId } }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get reviews by vendor ID
  async getReviewsByVendorId(vendorId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.serviceReview.findMany({
        where: { vendorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              currency: true,
              imageUrl: true,
            },
          },
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          appointment: {
            select: {
              id: true,
              appointmentDate: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.serviceReview.count({ where: { vendorId } }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get reviews by client ID
  async getReviewsByClientId(clientId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.serviceReview.findMany({
        where: { clientId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              currency: true,
              imageUrl: true,
            },
          },
          vendor: {
            select: {
              id: true,
              fullName: true,
              businessName: true,
              email: true,
            },
          },
          appointment: {
            select: {
              id: true,
              appointmentDate: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.serviceReview.count({ where: { clientId } }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get review statistics
  async getReviewStats(serviceId?: string, vendorId?: string) {
    let where: any = {};
    if (serviceId) where.serviceId = serviceId;
    if (vendorId) where.vendorId = vendorId;

    const [
      totalReviews,
      averageRating,
      ratingDistribution,
      recentReviews,
    ] = await Promise.all([
      this.prisma.serviceReview.count({ where }),
      this.prisma.serviceReview.aggregate({
        where,
        _avg: { rating: true },
      }),
      this.prisma.serviceReview.groupBy({
        by: ['rating'],
        where,
        _count: { rating: true },
      }),
      this.prisma.serviceReview.findMany({
        where,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      }),
    ]);

    return {
      totalReviews,
      averageRating: averageRating._avg.rating || 0,
      ratingDistribution: ratingDistribution.reduce((acc, item) => {
        acc[item.rating] = item._count.rating;
        return acc;
      }, {}),
      recentReviews,
    };
  }

  // Get service rating summary
  async getServiceRatingSummary(serviceId: string) {
    const stats = await this.getReviewStats(serviceId);
    
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        imageUrl: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return {
      service,
      ...stats,
    };
  }

  // Get vendor rating summary
  async getVendorRatingSummary(vendorId: string) {
    const stats = await this.getReviewStats(undefined, vendorId);
    
    const vendor = await this.prisma.profile.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        fullName: true,
        businessName: true,
        email: true,
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return {
      vendor,
      ...stats,
    };
  }

  // Search reviews
  async searchReviews(query: string, serviceId?: string, vendorId?: string) {
    let where: any = {
      OR: [
        { reviewText: { contains: query, mode: 'insensitive' } },
        { service: { name: { contains: query, mode: 'insensitive' } } },
        { client: { fullName: { contains: query, mode: 'insensitive' } } },
      ],
    };

    if (serviceId) where.serviceId = serviceId;
    if (vendorId) where.vendorId = vendorId;

    return this.prisma.serviceReview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            currency: true,
            imageUrl: true,
          },
        },
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        vendor: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            status: true,
          },
        },
      },
    });
  }

  // ========== PRODUCT REVIEWS ==========

  /**
   * Verify if user has purchased the product
   */
  private async verifyProductPurchase(userId: string, productId: string): Promise<boolean> {
    // Check regular orders
    // Accept orders that have been paid (even if not yet completed/delivered)
    // This allows users to review products after payment, not just after delivery
    const orderWithProduct = await this.prisma.order.findFirst({
      where: {
        userId,
        status: {
          in: ['completed', 'delivered', 'confirmed', 'processing', 'paid'],
        },
        paymentStatus: {
          in: ['completed', 'paid', 'processing', 'enterprise_pending'],
        },
        orderItems: {
          some: {
            productId,
          },
        },
      },
      include: {
        orderItems: {
          where: {
            productId,
          },
        },
      },
    });

    if (orderWithProduct) {
      return true;
    }

    // Check manufacturer orders (for retailers ordering from manufacturers)
    const manufacturerOrder = await this.prisma.manufacturerOrder.findFirst({
      where: {
        retailerId: userId,
        productId,
        status: {
          in: ['completed', 'delivered', 'processing'],
        },
        paymentStatus: {
          in: ['paid', 'processing', 'enterprise_pending'],
        },
      },
    });

    return !!manufacturerOrder;
  }

  /**
   * Get product reviews
   */
  async getProductReviews(productId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          itemId: productId,
          itemType: 'product',
          isActive: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              businessName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.review.count({
        where: {
          itemId: productId,
          itemType: 'product',
          isActive: true,
        },
      }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create product review (with verification)
   */
  async createProductReview(createProductReviewDto: CreateProductReviewDto, userId: string) {
    const { productId, rating, title, comment } = createProductReviewDto;

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Verify user has purchased the product
    const hasPurchased = await this.verifyProductPurchase(userId, productId);
    if (!hasPurchased) {
      throw new BadRequestException('You can only review products you have purchased');
    }

    // Check if review already exists
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_itemId_itemType: {
          userId,
          itemId: productId,
          itemType: 'product',
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        userId,
        itemId: productId,
        itemType: 'product',
        rating,
        title,
        comment,
        isVerified: true, // Verified because we checked purchase
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
          },
        },
      },
    });

    return review;
  }

  /**
   * Get product rating summary
   */
  async getProductRatingSummary(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        imageUrl: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const where = {
      itemId: productId,
      itemType: 'product',
      isActive: true,
    };

    const [totalReviews, averageRating, ratingDistribution, recentReviews] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.aggregate({
        where,
        _avg: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where,
        _count: { rating: true },
      }),
      this.prisma.review.findMany({
        where,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              businessName: true,
            },
          },
        },
      }),
    ]);

    return {
      product,
      totalReviews,
      averageRating: averageRating._avg.rating || 0,
      ratingDistribution: ratingDistribution.reduce((acc, item) => {
        acc[item.rating] = item._count.rating;
        return acc;
      }, {} as Record<number, number>),
      recentReviews,
    };
  }

  // ========== USER REVIEWS ==========

  /**
   * Verify if user has transacted with the reviewed user
   */
  private async verifyUserTransaction(reviewerId: string, reviewedUserId: string): Promise<boolean> {
    // Get reviewed user's role
    const reviewedUser = await this.prisma.profile.findUnique({
      where: { id: reviewedUserId },
      select: { role: true },
    });

    if (!reviewedUser) {
      return false;
    }

    const reviewedUserRole = reviewedUser.role;

    // Check based on roles
    if (reviewedUserRole === 'retailer') {
      // Check if reviewer has ordered from this retailer
      const order = await this.prisma.order.findFirst({
        where: {
          userId: reviewerId,
          retailerId: reviewedUserId,
          status: {
            in: ['completed', 'delivered', 'confirmed'],
          },
          paymentStatus: {
            in: ['completed', 'paid'],
          },
        },
      });
      return !!order;
    }

    if (reviewedUserRole === 'vendor') {
      // Check if reviewer has booked service with this vendor
      const appointment = await this.prisma.appointment.findFirst({
        where: {
          clientId: reviewerId,
          vendorId: reviewedUserId,
          status: 'completed',
        },
      });
      return !!appointment;
    }

    if (reviewedUserRole === 'manufacturer') {
      // Check if reviewer (retailer) has ordered from this manufacturer
      const manufacturerOrder = await this.prisma.manufacturerOrder.findFirst({
        where: {
          retailerId: reviewerId,
          manufacturerId: reviewedUserId,
          status: {
            in: ['completed', 'delivered'],
          },
          paymentStatus: 'paid',
        },
      });
      return !!manufacturerOrder;
    }

    if (reviewedUserRole === 'client') {
      // Check if reviewer (vendor/retailer) has served this client
      // Check appointments
      const appointment = await this.prisma.appointment.findFirst({
        where: {
          clientId: reviewedUserId,
          vendorId: reviewerId,
          status: 'completed',
        },
      });
      if (appointment) return true;

      // Check orders
      const order = await this.prisma.order.findFirst({
        where: {
          userId: reviewedUserId,
          retailerId: reviewerId,
          status: {
            in: ['completed', 'delivered', 'confirmed'],
          },
          paymentStatus: {
            in: ['completed', 'paid'],
          },
        },
      });
      return !!order;
    }

    return false;
  }

  /**
   * Get user reviews
   */
  async getUserReviews(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          itemId: userId,
          itemType: 'user',
          isActive: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              businessName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.review.count({
        where: {
          itemId: userId,
          itemType: 'user',
          isActive: true,
        },
      }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create user review (with verification)
   */
  async createUserReview(createUserReviewDto: CreateUserReviewDto, userId: string) {
    const { reviewedUserId, rating, title, comment } = createUserReviewDto;

    // Cannot review yourself
    if (userId === reviewedUserId) {
      throw new BadRequestException('You cannot review yourself');
    }

    // Verify reviewed user exists
    const reviewedUser = await this.prisma.profile.findUnique({
      where: { id: reviewedUserId },
    });

    if (!reviewedUser) {
      throw new NotFoundException('User not found');
    }

    // Verify user has transacted with the reviewed user
    const hasTransacted = await this.verifyUserTransaction(userId, reviewedUserId);
    if (!hasTransacted) {
      throw new BadRequestException('You can only review users you have transacted with');
    }

    // Check if review already exists
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_itemId_itemType: {
          userId,
          itemId: reviewedUserId,
          itemType: 'user',
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this user');
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        userId,
        itemId: reviewedUserId,
        itemType: 'user',
        rating,
        title,
        comment,
        isVerified: true, // Verified because we checked transaction
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return review;
  }

  /**
   * Get user rating summary
   */
  async getUserRatingSummary(userId: string) {
    const user = await this.prisma.profile.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        businessName: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const where = {
      itemId: userId,
      itemType: 'user',
      isActive: true,
    };

    const [totalReviews, averageRating, ratingDistribution, recentReviews] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.aggregate({
        where,
        _avg: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where,
        _count: { rating: true },
      }),
      this.prisma.review.findMany({
        where,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              businessName: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      user,
      totalReviews,
      averageRating: averageRating._avg.rating || 0,
      ratingDistribution: ratingDistribution.reduce((acc, item) => {
        acc[item.rating] = item._count.rating;
        return acc;
      }, {} as Record<number, number>),
      recentReviews,
    };
  }

  /**
   * Update generic review (for products/users)
   */
  async updateGenericReview(id: string, updateReviewDto: UpdateReviewDto, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Check permissions
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: {
        rating: updateReviewDto.rating,
        comment: updateReviewDto.comment || review.comment,
        title: updateReviewDto.title || review.title,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return updatedReview;
  }

  /**
   * Delete generic review (for products/users)
   */
  async deleteGenericReview(id: string, userId: string, userRole: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Check permissions
    if (userRole !== 'admin' && review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({
      where: { id },
    });

    return { message: 'Review deleted successfully' };
  }
}
