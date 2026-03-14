import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // Get comprehensive analytics dashboard data
  async getDashboardAnalytics(userId?: string, userRole?: string, dateRange?: { from: string; to: string }) {
    const whereClause = this.buildWhereClause(userId, userRole, dateRange);
    
    try {
      // ✅ OPTIMIZED: Reduce concurrent database calls to prevent connection pool exhaustion
      // Process in smaller batches to avoid overwhelming the connection pool
      
      // Batch 1: Core analytics (most important)
      const [orderStats, revenueStats, userStats] = await Promise.all([
        this.getOrderAnalytics(whereClause),
        this.getRevenueAnalytics(whereClause),
        this.getUserAnalytics(whereClause),
      ]);

      // Batch 2: Secondary analytics
      const [productStats, serviceStats, paymentStats] = await Promise.all([
        this.getProductAnalytics(whereClause),
        this.getServiceAnalytics(whereClause),
        this.getPaymentAnalytics(whereClause),
      ]);

      // Batch 3: Additional analytics (less critical)
      const [ticketStats, reviewStats, liveShoppingStats] = await Promise.all([
        this.getTicketAnalytics(whereClause),
        this.getReviewAnalytics(whereClause),
        this.getLiveShoppingAnalytics(whereClause),
      ]);

      // Batch 4: Final analytics
      const [manufacturerOrderStats, onboardingStats] = await Promise.all([
        this.getManufacturerOrderAnalytics(whereClause),
        this.getOnboardingAnalytics(whereClause),
      ]);

      return {
        orders: orderStats,
        revenue: revenueStats,
        products: productStats,
        services: serviceStats,
        users: userStats,
        payments: paymentStats,
        tickets: ticketStats,
        reviews: reviewStats,
        liveShopping: liveShoppingStats,
        manufacturerOrders: manufacturerOrderStats,
        onboarding: onboardingStats,
        summary: this.generateSummary({
          orderStats,
          revenueStats,
          productStats,
          serviceStats,
          userStats,
          paymentStats,
          ticketStats,
          reviewStats,
          liveShoppingStats,
          manufacturerOrderStats,
          onboardingStats,
        }),
      };
    } catch (error) {
      console.error('Error in getDashboardAnalytics:', error);
      // Return minimal data if analytics fail
      return {
        orders: { total: 0, completed: 0, pending: 0, cancelled: 0 },
        revenue: { total: 0, today: 0, thisWeek: 0, thisMonth: 0 },
        products: { total: 0, active: 0, inactive: 0 },
        services: { total: 0, active: 0, inactive: 0 },
        users: { total: 0, active: 0, byRole: {} },
        payments: { total: 0, successful: 0, failed: 0 },
        tickets: { total: 0, open: 0, closed: 0 },
        reviews: { total: 0, average: 0 },
        liveShopping: { total: 0, live: 0, scheduled: 0 },
        manufacturerOrders: { total: 0, pending: 0, completed: 0 },
        onboarding: { total: 0, completed: 0, pending: 0 },
        summary: { message: 'Analytics temporarily unavailable' },
      };
    }
  }

  // ✅ NEW: Lightweight dashboard analytics (faster, fewer DB calls)
  async getLightDashboardAnalytics(userId?: string, userRole?: string, dateRange?: { from: string; to: string }) {
    const whereClause = this.buildWhereClause(userId, userRole, dateRange);
    
    try {
      // ✅ OPTIMIZED: Only get essential analytics with minimal DB calls
      const [orderStats, revenueStats] = await Promise.all([
        this.getOrderAnalytics(whereClause),
        this.getRevenueAnalytics(whereClause),
      ]);

      return {
        orders: orderStats,
        revenue: revenueStats,
        // Minimal data for other sections
        products: { total: 0, active: 0, inactive: 0 },
        services: { total: 0, active: 0, inactive: 0 },
        users: { total: 0, active: 0, byRole: {} },
        payments: { total: 0, successful: 0, failed: 0 },
        tickets: { total: 0, open: 0, closed: 0 },
        reviews: { total: 0, average: 0 },
        liveShopping: { total: 0, live: 0, scheduled: 0 },
        manufacturerOrders: { total: 0, pending: 0, completed: 0 },
        onboarding: { total: 0, completed: 0, pending: 0 },
        summary: { message: 'Lightweight analytics loaded' },
      };
    } catch (error) {
      console.error('Error in getLightDashboardAnalytics:', error);
      // Return minimal data if analytics fail
      return {
        orders: { total: 0, completed: 0, pending: 0, cancelled: 0 },
        revenue: { total: 0, today: 0, thisWeek: 0, thisMonth: 0 },
        products: { total: 0, active: 0, inactive: 0 },
        services: { total: 0, active: 0, inactive: 0 },
        users: { total: 0, active: 0, byRole: {} },
        payments: { total: 0, successful: 0, failed: 0 },
        tickets: { total: 0, open: 0, closed: 0 },
        reviews: { total: 0, average: 0 },
        liveShopping: { total: 0, live: 0, scheduled: 0 },
        manufacturerOrders: { total: 0, pending: 0, completed: 0 },
        onboarding: { total: 0, completed: 0, pending: 0 },
        summary: { message: 'Analytics temporarily unavailable' },
      };
    }
  }

  // ✅ NEW: Unified retailer dashboard data
  async getRetailerDashboard(retailerId: string) {
    try {
      const whereClause = this.buildWhereClause(retailerId, 'retailer');
      
      // ✅ OPTIMIZED: Get all retailer data in parallel batches
      const [
        // Core stats (most important)
        orderStats,
        revenueStats,
        productStats,
        liveShoppingStats,
      ] = await Promise.all([
        this.getOrderAnalytics(whereClause),
        this.getRevenueAnalytics(whereClause),
        this.getProductAnalytics(whereClause),
        this.getLiveShoppingAnalytics(whereClause),
      ]);

      // ✅ OPTIMIZED: Get top products with single query
      const topProducts = await this.getTopProductsForRetailer(retailerId, 5);

      return {
        // Core metrics
        totalRevenue: revenueStats.total,
        totalOrders: orderStats.total,
        averageOrderValue: orderStats.total > 0 ? revenueStats.total / orderStats.total : 0,
        pendingOrders: orderStats.pending,
        
        // Product metrics
        totalProducts: productStats.total,
        activeProducts: productStats.active,
        lowStockProducts: productStats.lowStock || 0,
        
        // Live shopping metrics
        totalLiveSessions: liveShoppingStats.totalSessions,
        liveSessions: liveShoppingStats.live,
        scheduledSessions: liveShoppingStats.scheduled,
        
        // Top products (simplified)
        topProducts: topProducts,
        
        // Recent orders (limited to 10) - fetch separately
        recentOrders: await this.getRecentOrdersForRetailer(retailerId, 10),
        
        // Customer stats (simplified) - fetch separately
        customerStats: await this.getCustomerStatsForRetailer(retailerId),
        
        // Performance metrics
        orderFulfillmentRate: orderStats.total > 0 ? 
          ((orderStats.completed / orderStats.total) * 100) : 0,
      };
    } catch (error) {
      console.error('Error in getRetailerDashboard:', error);
      // Return minimal data if dashboard fails
      return {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        pendingOrders: 0,
        totalProducts: 0,
        activeProducts: 0,
        lowStockProducts: 0,
        totalLiveSessions: 0,
        liveSessions: 0,
        scheduledSessions: 0,
        topProducts: [],
        recentOrders: [],
        customerStats: { totalCustomers: 0, newCustomers: 0 },
        orderFulfillmentRate: 0,
      };
    }
  }

  // ✅ NEW: Unified vendor dashboard data
  async getVendorDashboard(vendorId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      // Base where clause for service appointments - only count paid and completed appointments
      // Note: paymentStatus can be 'processing' (after payment) or 'paid'/'completed'
      // Also check order status - if order is 'confirmed' or 'paid', it's been paid
      const baseWhere = {
        vendorId: vendorId,
        status: { notIn: ['cancelled', 'rejected'] },
        order: {
          AND: [
            { status: { not: 'cancelled' } },
            {
              OR: [
                // Payment status indicates payment (including 'processing' which means payment is in progress)
                { paymentStatus: { in: ['paid', 'completed', 'processing'] } },
                // Order status indicates payment was successful
                { status: { in: ['paid', 'confirmed'] } },
              ],
            },
          ],
        },
      };

      // Get service appointments stats in parallel
      const [
        totalAppointments,
        completedAppointments,
        pendingAppointments,
        totalRevenue,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        totalServices,
        activeServices,
      ] = await Promise.all([
        // Total appointments (paid and not cancelled)
        this.prisma.serviceAppointment.count({
          where: baseWhere,
        }),
        // Completed appointments
        this.prisma.serviceAppointment.count({
          where: {
            ...baseWhere,
            status: 'completed',
          },
        }),
        // Pending appointments
        this.prisma.serviceAppointment.count({
          where: {
            ...baseWhere,
            status: 'pending',
          },
        }),
        // Total revenue (sum of servicePrice from all paid appointments)
        this.prisma.serviceAppointment.aggregate({
          where: baseWhere,
          _sum: { servicePrice: true },
        }),
        // Today's revenue
        this.prisma.serviceAppointment.aggregate({
          where: {
            ...baseWhere,
            createdAt: { gte: today },
          },
          _sum: { servicePrice: true },
        }),
        // This week's revenue
        this.prisma.serviceAppointment.aggregate({
          where: {
            ...baseWhere,
            createdAt: { gte: weekAgo },
          },
          _sum: { servicePrice: true },
        }),
        // This month's revenue
        this.prisma.serviceAppointment.aggregate({
          where: {
            ...baseWhere,
            createdAt: { gte: monthAgo },
          },
          _sum: { servicePrice: true },
        }),
        // Total services
        this.prisma.service.count({
          where: { vendorId: vendorId },
        }),
        // Active services
        this.prisma.service.count({
          where: { vendorId: vendorId, isActive: true },
        }),
      ]);

      // Get unique customers count - use raw query for better performance
      const uniqueCustomersResult = await this.prisma.$queryRaw<Array<{ clientId: string }>>`
        SELECT DISTINCT o.client_id as "clientId"
        FROM service_appointments sa
        INNER JOIN orders o ON sa.order_id = o.id
        WHERE sa.vendor_id = ${vendorId}
          AND sa.status NOT IN ('cancelled', 'rejected')
          AND (
            o.payment_status IN ('paid', 'completed', 'processing')
            OR o.status IN ('paid', 'confirmed', 'processing')
          )
          AND o.status != 'cancelled'
          AND o.payment_status != 'failed'
      `;

      const customerIds = new Set(
        uniqueCustomersResult.map((row) => row.clientId).filter(Boolean)
      );

      // Get new customers this week
      const thisWeekCustomersResult = await this.prisma.$queryRaw<Array<{ clientId: string }>>`
        SELECT DISTINCT o.client_id as "clientId"
        FROM service_appointments sa
        INNER JOIN orders o ON sa.order_id = o.id
        WHERE sa.vendor_id = ${vendorId}
          AND sa.status NOT IN ('cancelled', 'rejected')
          AND (
            o.payment_status IN ('paid', 'completed', 'processing')
            OR o.status IN ('paid', 'confirmed', 'processing')
          )
          AND o.status != 'cancelled'
          AND o.payment_status != 'failed'
          AND sa.created_at >= ${weekAgo}
      `;

      const thisWeekCustomerIds = new Set(
        thisWeekCustomersResult.map((row) => row.clientId).filter(Boolean)
      );

      // Calculate completion rate
      const completionRate =
        totalAppointments > 0
          ? (completedAppointments / totalAppointments) * 100
          : 0;

      // Count appointments this month
      const monthAppointments = await this.prisma.serviceAppointment.count({
        where: {
          ...baseWhere,
          createdAt: { gte: monthAgo },
        },
      });

      // Count appointments this week
      const weekAppointments = await this.prisma.serviceAppointment.count({
        where: {
          ...baseWhere,
          createdAt: { gte: weekAgo },
        },
      });

      return {
        // Core metrics
        totalRevenue: Number(totalRevenue._sum.servicePrice || 0),
        totalOrders: totalAppointments,
        pendingOrders: pendingAppointments,
        completedOrders: completedAppointments,
        averageOrderValue:
          totalAppointments > 0
            ? Number(totalRevenue._sum.servicePrice || 0) / totalAppointments
            : 0,

        // Revenue by period
        todayRevenue: Number(todayRevenue._sum.servicePrice || 0),
        weekRevenue: Number(weekRevenue._sum.servicePrice || 0),
        monthRevenue: Number(monthRevenue._sum.servicePrice || 0),

        // Service metrics
        totalServices: totalServices,
        activeServices: activeServices,

        // Customer metrics
        totalCustomers: customerIds.size,
        newCustomers: thisWeekCustomerIds.size,

        // Performance metrics
        monthServicesCompletedRate: completionRate,
        monthServices: monthAppointments,
        weekSales: weekAppointments,
        monthSales: monthAppointments,
      };
    } catch (error) {
      console.error('Error in getVendorDashboard:', error);
      // Return minimal data if dashboard fails
      return {
        totalRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        averageOrderValue: 0,
        todayRevenue: 0,
        weekRevenue: 0,
        monthRevenue: 0,
        totalServices: 0,
        activeServices: 0,
        totalCustomers: 0,
        newCustomers: 0,
        monthServicesCompletedRate: 0,
        monthServices: 0,
        weekSales: 0,
        monthSales: 0,
      };
    }
  }

  // ✅ NEW: Get top products for retailer (optimized)
  private async getTopProductsForRetailer(retailerId: string, limit: number = 5) {
    try {
      // Single optimized query instead of complex joins
      const topProducts = await this.prisma.$queryRaw`
        SELECT 
          p.id,
          p.name,
          p.image_url,
          p.price,
          p.stock_quantity,
          COALESCE(SUM(oi.quantity), 0) as sales_count,
          COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id 
          AND o.status IN ('paid', 'ready_for_shipping', 'in_transit', 'shipped', 'delivered')
          AND o.retailer_id = ${retailerId}
        WHERE p.retailer_id = ${retailerId}
        GROUP BY p.id, p.name, p.image_url, p.price, p.stock_quantity
        ORDER BY revenue DESC
        LIMIT ${limit}
      `;
      
      // Convert BigInt values to numbers for JSON serialization
      return (topProducts as any[]).map((product: any) => ({
        ...product,
        sales_count: Number(product.sales_count),
        revenue: Number(product.revenue),
        price: Number(product.price),
        stock_quantity: Number(product.stock_quantity)
      }));
    } catch (error) {
      console.error('Error fetching top products:', error);
      return [];
    }
  }

  // ✅ NEW: Get recent orders for retailer
  private async getRecentOrdersForRetailer(retailerId: string, limit: number = 10) {
    try {
      const recentOrders = await this.prisma.order.findMany({
        where: {
          retailerId,
          OR: [
            // CHANGE: Paystack-paid orders
            {
              paymentStatus: 'paid',
            } as any,
            {
              paystackReference: { not: null },
            } as any,
            // Legacy paid orders
            {
              paymentReference: { not: null },
            } as any,
            // Customer pays at door orders (created immediately, payment pending)
            {
              paymentDueAtDoor: true,
            } as any
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          customerEmail: true,
          paymentDueAtDoor: true,
          paymentStatus: true,
          orderItems: {
            select: {
              title: true,
              quantity: true,
              unitPrice: true,
            },
          },
        } as any,
      });

      return recentOrders.map((order: any) => ({
        id: order.id,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt instanceof Date 
          ? order.createdAt.toISOString() 
          : new Date(order.createdAt).toISOString(),
        customerEmail: order.customerEmail,
        paymentDueAtDoor: order.paymentDueAtDoor || false,
        paymentStatus: order.paymentStatus,
        orderItems: order.orderItems.map((item: any) => ({
          title: item.title || 'Unknown Product',
          quantity: item.quantity,
          price: item.unitPrice,
        })),
      }));
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      return [];
    }
  }

  // ✅ NEW: Get customer stats for retailer
  private async getCustomerStatsForRetailer(retailerId: string) {
    try {
      const [totalCustomers, newCustomers] = await Promise.all([
        // Total unique customers
        this.prisma.order.findMany({
          where: {
            retailerId,
            OR: [
              { paymentStatus: 'paid' } as any,
              { paystackReference: { not: null } } as any,
              { paymentReference: { not: null } } as any,
            ],
          },
          select: { userId: true },
          distinct: ['userId'],
        }),
        
        // New customers this month
        this.prisma.order.findMany({
          where: {
            retailerId,
            OR: [
              { paymentStatus: 'paid' } as any,
              { paystackReference: { not: null } } as any,
              { paymentReference: { not: null } } as any,
            ],
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          select: { userId: true },
          distinct: ['userId'],
        }),
      ]);

      return {
        totalCustomers: totalCustomers.length,
        newCustomers: newCustomers.length,
      };
    } catch (error) {
      console.error('Error fetching customer stats:', error);
      return {
        totalCustomers: 0,
        newCustomers: 0,
      };
    }
  }

  // Get order analytics
  public async getOrderAnalytics(whereClause: any) {
    // Only count orders with successful Paystack payments
    const paystackOrdersWhere = {
      ...whereClause.orders,
      paymentReference: { not: null },
      paymentStatus: 'paid'
    };

    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      todayOrders,
      weekOrders,
      monthOrders,
      ordersByStatus,
      ordersByMonth,
    ] = await Promise.all([
      this.prisma.order.count({ where: paystackOrdersWhere }),
      this.prisma.order.count({ where: { ...paystackOrdersWhere, status: 'pending' } }),
      this.prisma.order.count({ where: { ...paystackOrdersWhere, status: { equals: 'confirmed', mode: 'insensitive' } } }),
      this.prisma.order.count({ where: { ...paystackOrdersWhere, status: 'cancelled' } }),
      this.prisma.order.count({ where: { ...paystackOrdersWhere, createdAt: { gte: whereClause.today } } }),
      this.prisma.order.count({ where: { ...paystackOrdersWhere, createdAt: { gte: whereClause.weekAgo } } }),
      this.prisma.order.count({ where: { ...paystackOrdersWhere, createdAt: { gte: whereClause.monthAgo } } }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: paystackOrdersWhere,
        _count: { status: true },
      }),
      this.getOrdersByMonth(paystackOrdersWhere),
    ]);

    return {
      total: Number(totalOrders),
      pending: Number(pendingOrders),
      completed: Number(completedOrders),
      cancelled: Number(cancelledOrders),
      today: Number(todayOrders),
      thisWeek: Number(weekOrders),
      thisMonth: Number(monthOrders),
      byStatus: ordersByStatus,
      byMonth: ordersByMonth,
    };
  }

  // Get revenue analytics
  public async getRevenueAnalytics(whereClause: any) {
    // Only count revenue from successful Paystack payments
    const paystackOrdersWhere = {
      ...whereClause.orders,
      paymentReference: { not: null },
      paymentStatus: 'paid',
      status: { not: 'cancelled' }
    };

    const [
      totalRevenue,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      revenueByMonth,
      averageOrderValue,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: paystackOrdersWhere,
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { ...paystackOrdersWhere, createdAt: { gte: whereClause.today } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { ...paystackOrdersWhere, createdAt: { gte: whereClause.weekAgo } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { ...paystackOrdersWhere, createdAt: { gte: whereClause.monthAgo } },
        _sum: { totalAmount: true },
      }),
      this.getRevenueByMonth(paystackOrdersWhere),
      this.prisma.order.aggregate({
        where: paystackOrdersWhere,
        _avg: { totalAmount: true },
      }),
    ]);

    return {
      total: Number(totalRevenue._sum.totalAmount || 0),
      today: Number(todayRevenue._sum.totalAmount || 0),
      thisWeek: Number(weekRevenue._sum.totalAmount || 0),
      thisMonth: Number(monthRevenue._sum.totalAmount || 0),
      byMonth: revenueByMonth,
      averageOrderValue: Number(averageOrderValue._avg.totalAmount || 0),
    };
  }

  // Get product analytics
  public async getProductAnalytics(whereClause: any) {
    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      productsByCategory,
      topSellingProducts,
    ] = await Promise.all([
      this.prisma.product.count({ where: whereClause.products }),
      this.prisma.product.count({ where: { ...whereClause.products, isActive: true } }),
      this.prisma.product.count({ where: { ...whereClause.products, stockQuantity: { lte: 10 } } }),
      this.prisma.product.count({ where: { ...whereClause.products, stockQuantity: 0 } }),
      this.prisma.product.groupBy({
        by: ['categoryId'],
        where: whereClause.products,
        _count: { categoryId: true },
      }),
      this.getTopSellingProducts(whereClause.products),
    ]);

    return {
      total: Number(totalProducts),
      active: Number(activeProducts),
      lowStock: Number(lowStockProducts),
      outOfStock: Number(outOfStockProducts),
      byCategory: productsByCategory,
      topSelling: topSellingProducts,
    };
  }

  // Get service analytics
  public async getServiceAnalytics(whereClause: any) {
    const [
      totalServices,
      activeServices,
      servicesByCategory,
      topRatedServices,
    ] = await Promise.all([
      this.prisma.service.count({ where: whereClause.services }),
      this.prisma.service.count({ where: { ...whereClause.services, isActive: true } }),
      this.prisma.service.groupBy({
        by: ['categoryId'],
        where: whereClause.services,
        _count: { categoryId: true },
      }),
      this.getTopRatedServices(whereClause.services),
    ]);

    return {
      total: Number(totalServices),
      active: Number(activeServices),
      byCategory: servicesByCategory,
      topRated: topRatedServices,
    };
  }

  // Get user analytics
  public async getUserAnalytics(whereClause: any) {
    const [
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      usersByRole,
      activeUsers,
    ] = await Promise.all([
      this.prisma.profile.count({ where: whereClause.users }),
      this.prisma.profile.count({ where: { ...whereClause.users, createdAt: { gte: whereClause.today } } }),
      this.prisma.profile.count({ where: { ...whereClause.users, createdAt: { gte: whereClause.weekAgo } } }),
      this.prisma.profile.count({ where: { ...whereClause.users, createdAt: { gte: whereClause.monthAgo } } }),
      this.prisma.profile.groupBy({
        by: ['role'],
        where: whereClause.users,
        _count: { role: true },
      }),
      this.getActiveUsers(whereClause.users),
    ]);

    return {
      total: Number(totalUsers),
      newToday: Number(newUsersToday),
      newThisWeek: Number(newUsersThisWeek),
      newThisMonth: Number(newUsersThisMonth),
      byRole: usersByRole,
      active: activeUsers,
    };
  }

  // Get payment analytics
  public async getPaymentAnalytics(whereClause: any) {
    const [
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      totalAmount,
      todayAmount,
      weekAmount,
      monthAmount,
    ] = await Promise.all([
      this.prisma.order.count({ where: whereClause.orders }),
      this.prisma.order.count({ where: { ...whereClause.orders, status: 'completed' } }),
      this.prisma.order.count({ where: { ...whereClause.orders, status: 'cancelled' } }),
      this.prisma.order.aggregate({
        where: { ...whereClause.orders, status: { not: 'cancelled' } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { ...whereClause.orders, status: { not: 'cancelled' }, createdAt: { gte: whereClause.today } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { ...whereClause.orders, status: { not: 'cancelled' }, createdAt: { gte: whereClause.weekAgo } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { ...whereClause.orders, status: { not: 'cancelled' }, createdAt: { gte: whereClause.monthAgo } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalTransactions: Number(totalTransactions),
      successful: Number(successfulTransactions),
      failed: Number(failedTransactions),
      totalAmount: Number(totalAmount._sum.totalAmount || 0),
      todayAmount: Number(todayAmount._sum.totalAmount || 0),
      weekAmount: Number(weekAmount._sum.totalAmount || 0),
      monthAmount: Number(monthAmount._sum.totalAmount || 0),
    };
  }

  // Get ticket analytics
  public async getTicketAnalytics(whereClause: any) {
    const [
      totalTickets,
      openTickets,
      closedTickets,
      ticketsByPriority,
      ticketsByStatus,
    ] = await Promise.all([
      this.prisma.ticket.count({ where: whereClause.tickets }),
      this.prisma.ticket.count({ where: { ...whereClause.tickets, status: 'open' } }),
      this.prisma.ticket.count({ where: { ...whereClause.tickets, status: 'closed' } }),
      this.prisma.ticket.groupBy({
        by: ['priority'],
        where: whereClause.tickets,
        _count: { priority: true },
      }),
      this.prisma.ticket.groupBy({
        by: ['status'],
        where: whereClause.tickets,
        _count: { status: true },
      }),
    ]);

    return {
      total: Number(totalTickets),
      open: Number(openTickets),
      closed: Number(closedTickets),
      byPriority: ticketsByPriority,
      byStatus: ticketsByStatus,
    };
  }

  // Get review analytics
  public async getReviewAnalytics(whereClause: any) {
    const [
      totalReviews,
      averageRating,
      reviewsByRating,
      recentReviews,
    ] = await Promise.all([
      this.prisma.review.count({ where: whereClause.reviews }),
      this.prisma.review.aggregate({
        where: whereClause.reviews,
        _avg: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: whereClause.reviews,
        _count: { rating: true },
      }),
      this.prisma.review.findMany({
        where: whereClause.reviews,
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
      total: Number(totalReviews),
      averageRating: Number(averageRating._avg.rating || 0),
      byRating: reviewsByRating,
      recent: recentReviews,
    };
  }

  // Get live shopping analytics
  public async getLiveShoppingAnalytics(whereClause: any) {
    const [
      totalSessions,
      liveSessions,
      scheduledSessions,
      endedSessions,
      totalMessages,
      totalParticipants,
    ] = await Promise.all([
      this.prisma.liveShoppingSession.count({ where: whereClause.liveShopping }),
      this.prisma.liveShoppingSession.count({ where: { ...whereClause.liveShopping, status: 'live' } }),
      this.prisma.liveShoppingSession.count({ where: { ...whereClause.liveShopping, status: 'scheduled' } }),
      this.prisma.liveShoppingSession.count({ where: { ...whereClause.liveShopping, status: 'ended' } }),
      this.prisma.liveSessionMessage.count(),
      this.prisma.liveSessionParticipant.count(),
    ]);

    return {
      totalSessions: Number(totalSessions),
      live: Number(liveSessions),
      scheduled: Number(scheduledSessions),
      ended: Number(endedSessions),
      totalMessages: Number(totalMessages),
      totalParticipants: Number(totalParticipants),
    };
  }

  // Get manufacturer order analytics
  public async getManufacturerOrderAnalytics(whereClause: any) {
    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.manufacturerOrder.count({ where: whereClause.manufacturerOrders }),
      this.prisma.manufacturerOrder.count({ where: { ...whereClause.manufacturerOrders, status: 'pending' } }),
      this.prisma.manufacturerOrder.count({ where: { ...whereClause.manufacturerOrders, status: { equals: 'confirmed', mode: 'insensitive' } } }),
      this.prisma.manufacturerOrder.count({ where: { ...whereClause.manufacturerOrders, status: 'shipped' } }),
      this.prisma.manufacturerOrder.count({ where: { ...whereClause.manufacturerOrders, status: 'delivered' } }),
      this.prisma.manufacturerOrder.aggregate({
        where: { ...whereClause.manufacturerOrders, status: { not: 'cancelled' } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      total: Number(totalOrders),
      pending: Number(pendingOrders),
      confirmed: Number(confirmedOrders),
      shipped: Number(shippedOrders),
      delivered: Number(deliveredOrders),
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
    };
  }

  // Get onboarding analytics
  public async getOnboardingAnalytics(whereClause: any) {
    const [
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      submissionsByRole,
    ] = await Promise.all([
      this.prisma.onboardingSubmission.count({ where: whereClause.onboarding }),
      this.prisma.onboardingReview.count({ where: { ...whereClause.onboarding, status: 'pending' } }),
      this.prisma.onboardingReview.count({ where: { ...whereClause.onboarding, status: 'approved' } }),
      this.prisma.onboardingReview.count({ where: { ...whereClause.onboarding, status: 'rejected' } }),
      this.prisma.onboardingSubmission.findMany({
        where: whereClause.onboarding,
        include: {
          user: {
            select: { role: true },
          },
        },
      }).then(results => 
        results.reduce((acc, item) => {
          const role = item.user.role;
          acc[role] = (acc[role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ),
    ]);

    return {
      total: Number(totalSubmissions),
      pending: Number(pendingSubmissions),
      approved: Number(approvedSubmissions),
      rejected: Number(rejectedSubmissions),
      byRole: submissionsByRole,
    };
  }

  // Helper methods
  public buildWhereClause(userId?: string, userRole?: string, dateRange?: { from: string; to: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const baseWhere = dateRange ? {
      createdAt: {
        gte: new Date(dateRange.from),
        lte: new Date(dateRange.to),
      },
    } : {};

    return {
      today,
      weekAgo,
      monthAgo,
      orders: userId && userRole === 'retailer' ? { ...baseWhere, retailerId: userId } : baseWhere,
      products: userId && userRole === 'retailer' ? { ...baseWhere, retailerId: userId } : 
                userId && userRole === 'manufacturer' ? { ...baseWhere, manufacturerId: userId } : baseWhere,
      services: userId && userRole === 'vendor' ? { ...baseWhere, vendorId: userId } : baseWhere,
      users: baseWhere,
      tickets: userId ? { ...baseWhere, createdBy: userId } : baseWhere,
      reviews: baseWhere,
      liveShopping: userId && userRole === 'retailer' ? { ...baseWhere, retailerId: userId } : baseWhere,
      manufacturerOrders: userId && (userRole === 'retailer' || userRole === 'manufacturer') ? { ...baseWhere, OR: [{ retailerId: userId }, { manufacturerId: userId }] } : baseWhere,
      onboarding: userId ? { userId: userId } : {},
    };
  }

  private async getOrdersByMonth(whereClause: any) {
    // This would need a more complex query to group by month
    // For now, return empty array
    return [];
  }

  private async getRevenueByMonth(whereClause: any) {
    // This would need a more complex query to group by month
    // For now, return empty array
    return [];
  }

  private async getTopSellingProducts(whereClause: any) {
    // This would need to join with order items to get top selling products
    // For now, return empty array
    return [];
  }

  private async getTopRatedServices(whereClause: any) {
    // This would need to join with reviews to get top rated services
    // For now, return empty array
    return [];
  }

  private async getActiveUsers(whereClause: any) {
    // This would need to define what "active" means (e.g., users who made orders in last 30 days)
    // For now, return 0
    return 0;
  }

  // Get retailer-specific order statistics
  async getRetailerOrderStats(retailerId?: string, period?: string) {
    const dateFilter = this.getDateFilter(period);
    
    // Only count orders with successful Paystack payments
    const whereClause: any = {
      ...dateFilter,
      paymentReference: { not: null },
      paymentStatus: 'paid'
    };

    // If retailerId is provided, filter orders for that specific retailer
    if (retailerId) {
      whereClause.orderItems = {
        some: {
          product: {
            retailerId: retailerId
          }
        }
      };
    }

    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      cancelledOrders,
      totalRevenue,
      averageOrderValue,
      ordersByStatus,
      ordersByMonth,
      topRetailers,
      recentOrders,
      customerStats
    ] = await Promise.all([
      this.prisma.order.count({ where: whereClause }),
      this.prisma.order.count({ where: { ...whereClause, status: 'pending' } }),
      this.prisma.order.count({ where: { ...whereClause, status: { equals: 'confirmed', mode: 'insensitive' } } }),
      this.prisma.order.count({ where: { ...whereClause, status: 'cancelled' } }),
      this.prisma.order.aggregate({
        where: { ...whereClause, status: { not: 'cancelled' } },
        _sum: { totalAmount: true }
      }),
      this.prisma.order.aggregate({
        where: { ...whereClause, status: { not: 'cancelled' } },
        _avg: { totalAmount: true }
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { status: true }
      }),
      this.getOrdersByMonth(whereClause),
      retailerId ? [] : this.getTopRetailers(period), // Only get top retailers if not filtering by specific retailer
      this.getRecentOrders(whereClause, retailerId),
      this.getCustomerStats(whereClause, retailerId)
    ]);

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      cancelledOrders,
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      averageOrderValue: Number(averageOrderValue._avg.totalAmount || 0),
      byStatus: ordersByStatus,
      byMonth: ordersByMonth,
      topRetailers,
      recentOrders,
      customerStats
    };
  }

  // Get top performing retailers
  private async getTopRetailers(period?: string) {
    const dateFilter = this.getDateFilter(period);
    
    // Get all retailers first
    const retailers = await this.prisma.profile.findMany({
      where: {
        role: 'retailer'
      },
      include: {
        products: {
          include: {
            orderItems: {
              where: {
                order: {
                  ...dateFilter,
                  paymentReference: { not: null },
                  paymentStatus: 'paid',
                  status: { not: 'cancelled' }
                }
              },
              include: {
                order: true
              }
            }
          }
        }
      }
    });

    // Get all paid orders for the period
    const paidOrders = await this.prisma.order.findMany({
      where: {
        ...dateFilter,
        paymentReference: { not: null },
        paymentStatus: 'paid',
        status: { not: 'cancelled' }
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });

    return retailers.map(retailer => {
      // Find orders that have products from this retailer
      const retailerOrders = paidOrders.filter(order => 
        order.orderItems.some(item => item.product.retailerId === retailer.id)
      );
      
      const totalOrders = retailerOrders.length;
      const totalRevenue = retailerOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const lastOrder = retailerOrders.length > 0 ? 
        retailerOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] :
        null;

      return {
        id: retailer.id,
        businessName: retailer.businessName || 'Unnamed Business',
        email: retailer.email,
        totalOrders,
        totalRevenue,
        pendingOrders: retailerOrders.filter(order => order.status === 'pending').length,
        completedOrders: retailerOrders.filter(order => order.status === 'confirmed').length,
        averageOrderValue,
        lastOrderDate: lastOrder ? lastOrder.createdAt : null,
        paystackSubaccountId: retailer.paystackSubaccountId
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 20);
  }

  // Get recent orders for retailer
  private async getRecentOrders(whereClause: any, retailerId?: string) {
    const orders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                retailerId: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Filter orders by retailer if specified
    if (retailerId) {
      return orders.filter(order => 
        order.orderItems.some(item => item.product.retailerId === retailerId)
      );
    }

    return orders;
  }

  // Get customer statistics for retailer
  private async getCustomerStats(whereClause: any, retailerId?: string) {
    // Get all orders for the retailer
    const orders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                retailerId: true
              }
            }
          }
        }
      }
    });

    // Filter orders by retailer if specified
    const retailerOrders = retailerId ? 
      orders.filter(order => 
        order.orderItems.some(item => item.product.retailerId === retailerId)
      ) : orders;

    // Get unique customers
    const uniqueCustomers = new Set(retailerOrders.map(order => order.userId));
    const totalCustomers = uniqueCustomers.size;

    // Get repeat customers (customers with more than 1 order)
    const customerOrderCounts = retailerOrders.reduce((acc, order) => {
      acc[order.userId] = (acc[order.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const repeatCustomers = Object.values(customerOrderCounts).filter(count => count > 1).length;

    // Get new customers (first order in the period)
    const firstOrderDates = retailerOrders.reduce((acc, order) => {
      if (!acc[order.userId] || order.createdAt < acc[order.userId]) {
        acc[order.userId] = order.createdAt;
      }
      return acc;
    }, {} as Record<string, Date>);

    const periodStart = whereClause.createdAt?.gte || new Date(0);
    const newCustomers = Object.values(firstOrderDates).filter(date => date >= periodStart).length;

    return {
      totalCustomers,
      repeatCustomers,
      newCustomers,
      averageOrdersPerCustomer: totalCustomers > 0 ? retailerOrders.length / totalCustomers : 0
    };
  }

  // Get date filter based on period
  private getDateFilter(period?: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        return { createdAt: { gte: today } };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { createdAt: { gte: weekAgo } };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { createdAt: { gte: monthAgo } };
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return { createdAt: { gte: yearAgo } };
      default:
        return {};
    }
  }

  private generateSummary(data: any) {
    return {
      totalRevenue: data.revenueStats.total,
      totalOrders: data.orderStats.total,
      totalUsers: data.userStats.total,
      totalProducts: data.productStats.total,
      totalServices: data.serviceStats.total,
      totalTickets: data.ticketStats.total,
      totalReviews: data.reviewStats.total,
      totalLiveSessions: data.liveShoppingStats.totalSessions,
      totalManufacturerOrders: data.manufacturerOrderStats.total,
      totalOnboardingSubmissions: data.onboardingStats.total,
    };
  }

  // ✅ NEW: Optimized executive summary for main dashboard
  async getExecutiveSummary() {
    try {
      console.log('📊 [ANALYTICS] Fetching executive summary...');
      
      // Single optimized query for all main KPIs
      const result = await this.prisma.$queryRaw`
        SELECT 
          -- User Metrics
          (SELECT COUNT(*) FROM profiles WHERE role IN ('client', 'vendor', 'retailer', 'manufacturer')) as total_users,
          (SELECT COUNT(*) FROM profiles WHERE role = 'vendor' AND is_verified = true AND is_suspended = false) as active_vendors,
          (SELECT COUNT(*) FROM profiles WHERE role = 'retailer' AND is_verified = true AND is_suspended = false) as active_retailers,
          (SELECT COUNT(*) FROM profiles WHERE role = 'manufacturer' AND is_verified = true AND is_suspended = false) as active_manufacturers,
          (SELECT COUNT(*) FROM profiles WHERE onboarding_status = 'pending') as pending_verifications,
          
          -- Revenue Metrics (Current Month) - Orders that are paid/confirmed/shipped/delivered/completed (considered paid)
          (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status IN ('paid', 'confirmed', 'ready_for_shipping', 'in_transit', 'shipped', 'delivered', 'completed') AND created_at >= date_trunc('month', CURRENT_DATE)) as monthly_revenue,
          (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status IN ('paid', 'confirmed', 'ready_for_shipping', 'in_transit', 'shipped', 'delivered', 'completed') AND created_at >= CURRENT_DATE) as today_revenue,
          (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status IN ('paid', 'confirmed', 'ready_for_shipping', 'in_transit', 'shipped', 'delivered', 'completed') AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')) as last_month_revenue,
          
          -- Order Metrics
          (SELECT COUNT(*) FROM orders WHERE created_at >= date_trunc('month', CURRENT_DATE)) as monthly_orders,
          (SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE) as today_orders,
          (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
          (SELECT COUNT(*) FROM orders WHERE status IN ('paid', 'confirmed', 'ready_for_shipping', 'in_transit', 'shipped', 'delivered', 'completed')) as completed_orders,
          
          -- Product/Service Metrics
          (SELECT COUNT(*) FROM products WHERE is_active = true) as total_products,
          (SELECT COUNT(*) FROM services WHERE is_active = true) as total_services,
          
          -- Escrow Metrics
          (SELECT COALESCE(SUM(amount), 0) FROM service_escrows WHERE status = 'pending') as escrow_pending_amount,
          (SELECT COUNT(*) FROM service_escrows WHERE status = 'pending') as escrow_pending_count,
          (SELECT COUNT(*) FROM service_escrows WHERE status = 'completed') as escrow_completed_count,
          (SELECT COUNT(*) FROM service_escrows WHERE status = 'disputed') as escrow_disputed_count
      ` as any[];

      const data = result[0];
      
      // Calculate growth rates
      const revenueGrowth = data.last_month_revenue > 0 
        ? ((data.monthly_revenue - data.last_month_revenue) / data.last_month_revenue * 100)
        : 0;

      const executiveSummary = {
        // User Metrics
        totalUsers: Number(data.total_users) || 0,
        activeVendors: Number(data.active_vendors) || 0,
        activeRetailers: Number(data.active_retailers) || 0,
        activeManufacturers: Number(data.active_manufacturers) || 0,
        pendingVerifications: Number(data.pending_verifications) || 0,
        
        // Revenue Metrics
        monthlyRevenue: Number(data.monthly_revenue) || 0,
        todayRevenue: Number(data.today_revenue) || 0,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100, // Round to 2 decimal places
        
        // Order Metrics
        monthlyOrders: Number(data.monthly_orders) || 0,
        todayOrders: Number(data.today_orders) || 0,
        pendingOrders: Number(data.pending_orders) || 0,
        completedOrders: Number(data.completed_orders) || 0,
        
        // Product/Service Metrics
        totalProducts: Number(data.total_products) || 0,
        totalServices: Number(data.total_services) || 0,
        
        // Escrow Metrics
        escrowStats: {
          pendingAmount: Number(data.escrow_pending_amount) || 0,
          pendingCount: Number(data.escrow_pending_count) || 0,
          completedCount: Number(data.escrow_completed_count) || 0,
          disputedCount: Number(data.escrow_disputed_count) || 0,
        },
        
        // Calculated Metrics
        averageOrderValue: data.monthly_orders > 0 ? Number(data.monthly_revenue) / Number(data.monthly_orders) : 0,
        completionRate: data.monthly_orders > 0 ? (Number(data.completed_orders) / Number(data.monthly_orders) * 100) : 0,
      };

      console.log('📊 [ANALYTICS] Executive summary fetched successfully');
      return executiveSummary;
      
    } catch (error) {
      console.error('❌ [ANALYTICS] Error fetching executive summary:', error);
      throw new Error('Failed to fetch executive summary');
    }
  }

  // ✅ NEW: Time Series Analytics Methods
  async getRevenueTimeSeries(period: 'daily' | 'weekly' | 'monthly' = 'daily', days: number = 30) {
    try {
      console.log(`📊 [ANALYTICS] Fetching revenue time series: ${period} for ${days} days`);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get all orders in the date range (confirmed/shipped/delivered/completed orders for revenue calculation)
      const orders = await this.prisma.order.findMany({
        where: {
          status: { in: ['paid', 'ready_for_shipping', 'in_transit', 'shipped', 'delivered', 'completed'] },
          createdAt: { gte: startDate }
        },
        select: {
          createdAt: true,
          totalAmount: true,
          status: true,
          paymentStatus: true
        }
      });

      console.log(`📊 [ANALYTICS] Found ${orders.length} paid orders for revenue calculation`);
      if (orders.length > 0) {
        console.log(`📊 [ANALYTICS] Sample order:`, {
          createdAt: orders[0].createdAt,
          totalAmount: orders[0].totalAmount,
          status: orders[0].status,
          paymentStatus: orders[0].paymentStatus
        });
      }

      // Generate complete date range
      const dateRange: string[] = [];
      const currentDate = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        
        let periodKey: string;
        if (period === 'daily') {
          periodKey = date.toISOString().split('T')[0];
        } else if (period === 'weekly') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
        } else { // monthly
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        }
        
        if (!dateRange.includes(periodKey)) {
          dateRange.push(periodKey);
        }
      }

      // Group by period
      const groupedData = new Map<string, { revenue: number; orderCount: number }>();
      
      // Initialize all periods with zero values
      dateRange.forEach(periodKey => {
        groupedData.set(periodKey, { revenue: 0, orderCount: 0 });
      });
      
      orders.forEach(order => {
        const date = new Date(order.createdAt);
        let periodKey: string;
        
        if (period === 'daily') {
          periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        } else if (period === 'weekly') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
        } else { // monthly
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        }
        
        if (groupedData.has(periodKey)) {
          const data = groupedData.get(periodKey)!;
          data.revenue += Number(order.totalAmount);
          data.orderCount += 1;
        }
      });

      // Convert to array with complete date range
      const formattedData = dateRange
        .map(periodKey => ({
          period: periodKey,
          revenue: groupedData.get(periodKey)?.revenue || 0,
          orderCount: groupedData.get(periodKey)?.orderCount || 0
        }));

      console.log(`✅ [ANALYTICS] Revenue time series fetched: ${formattedData.length} data points`);
      return formattedData;
      
    } catch (error) {
      console.error('❌ [ANALYTICS] Error fetching revenue time series:', error);
      throw new Error('Failed to fetch revenue time series');
    }
  }

  async getOrderVolumeTimeSeries(period: 'daily' | 'weekly' | 'monthly' = 'daily', days: number = 30) {
    try {
      console.log(`📊 [ANALYTICS] Fetching order volume time series: ${period} for ${days} days`);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get all orders in the date range
      const orders = await this.prisma.order.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        select: {
          createdAt: true,
          status: true,
          paymentStatus: true
        }
      });

      console.log(`📊 [ANALYTICS] Found ${orders.length} total orders for volume calculation`);
      if (orders.length > 0) {
        console.log(`📊 [ANALYTICS] Sample order:`, {
          createdAt: orders[0].createdAt,
          status: orders[0].status
        });
      }

      // Generate complete date range
      const dateRange: string[] = [];
      const currentDate = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        
        let periodKey: string;
        if (period === 'daily') {
          periodKey = date.toISOString().split('T')[0];
        } else if (period === 'weekly') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
        } else { // monthly
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        }
        
        if (!dateRange.includes(periodKey)) {
          dateRange.push(periodKey);
        }
      }

      // Group by period
      const groupedData = new Map<string, { 
        totalOrders: number; 
        completedOrders: number; 
        pendingOrders: number; 
        cancelledOrders: number; 
      }>();
      
      // Initialize all periods with zero values
      dateRange.forEach(periodKey => {
        groupedData.set(periodKey, { 
          totalOrders: 0, 
          completedOrders: 0, 
          pendingOrders: 0, 
          cancelledOrders: 0 
        });
      });
      
      orders.forEach(order => {
        const date = new Date(order.createdAt);
        let periodKey: string;
        
        if (period === 'daily') {
          periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        } else if (period === 'weekly') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
        } else { // monthly
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        }
        
        if (groupedData.has(periodKey)) {
          const data = groupedData.get(periodKey)!;
          data.totalOrders += 1;
          
          if (['confirmed', 'shipped', 'delivered', 'completed'].includes(order.status)) {
            data.completedOrders += 1;
          } else if (order.status === 'pending') {
            data.pendingOrders += 1;
          } else if (order.status === 'cancelled') {
            data.cancelledOrders += 1;
          }
        }
      });

      // Convert to array with complete date range
      const formattedData = dateRange
        .map(periodKey => ({
          period: periodKey,
          totalOrders: groupedData.get(periodKey)?.totalOrders || 0,
          completedOrders: groupedData.get(periodKey)?.completedOrders || 0,
          pendingOrders: groupedData.get(periodKey)?.pendingOrders || 0,
          cancelledOrders: groupedData.get(periodKey)?.cancelledOrders || 0
        }));

      console.log(`✅ [ANALYTICS] Order volume time series fetched: ${formattedData.length} data points`);
      return formattedData;
      
    } catch (error) {
      console.error('❌ [ANALYTICS] Error fetching order volume time series:', error);
      throw new Error('Failed to fetch order volume time series');
    }
  }

  async getUserGrowthTimeSeries(period: 'daily' | 'weekly' | 'monthly' = 'daily', days: number = 30) {
    try {
      console.log(`📊 [ANALYTICS] Fetching user growth time series: ${period} for ${days} days`);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get all profiles in the date range
      const profiles = await this.prisma.profile.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        select: {
          createdAt: true,
          role: true
        }
      });

      // Generate complete date range
      const dateRange: string[] = [];
      const currentDate = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        
        let periodKey: string;
        if (period === 'daily') {
          periodKey = date.toISOString().split('T')[0];
        } else if (period === 'weekly') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
        } else { // monthly
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        }
        
        if (!dateRange.includes(periodKey)) {
          dateRange.push(periodKey);
        }
      }

      // Group by period
      const groupedData = new Map<string, { 
        totalUsers: number; 
        clients: number; 
        vendors: number; 
        retailers: number; 
        manufacturers: number; 
      }>();
      
      // Initialize all periods with zero values
      dateRange.forEach(periodKey => {
        groupedData.set(periodKey, { 
          totalUsers: 0, 
          clients: 0, 
          vendors: 0, 
          retailers: 0, 
          manufacturers: 0 
        });
      });
      
      profiles.forEach(profile => {
        const date = new Date(profile.createdAt);
        let periodKey: string;
        
        if (period === 'daily') {
          periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        } else if (period === 'weekly') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
        } else { // monthly
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        }
        
        if (groupedData.has(periodKey)) {
          const data = groupedData.get(periodKey)!;
          
          // Only count non-admin users in totalUsers
          if (profile.role !== 'admin') {
            data.totalUsers += 1;
          }
          
          if (profile.role === 'client') {
            data.clients += 1;
          } else if (profile.role === 'vendor') {
            data.vendors += 1;
          } else if (profile.role === 'retailer') {
            data.retailers += 1;
          } else if (profile.role === 'manufacturer') {
            data.manufacturers += 1;
          }
        }
      });

      // Convert to array with complete date range
      const formattedData = dateRange
        .map(periodKey => ({
          period: periodKey,
          totalUsers: groupedData.get(periodKey)?.totalUsers || 0,
          clients: groupedData.get(periodKey)?.clients || 0,
          vendors: groupedData.get(periodKey)?.vendors || 0,
          retailers: groupedData.get(periodKey)?.retailers || 0,
          manufacturers: groupedData.get(periodKey)?.manufacturers || 0
        }));

      console.log(`✅ [ANALYTICS] User growth time series fetched: ${formattedData.length} data points`);
      return formattedData;
      
    } catch (error) {
      console.error('❌ [ANALYTICS] Error fetching user growth time series:', error);
      throw new Error('Failed to fetch user growth time series');
    }
  }
}
