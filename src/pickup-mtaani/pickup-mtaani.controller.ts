import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Logger,
} from "@nestjs/common"
import { PickupMtaaniService } from "./pickup-mtaani.service"
import { PaymentVerificationService } from "./payment-verification.service"
import { PrismaService } from "../prisma/prisma.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RetailerPackageDto } from "./dto/retailer-package.dto"

@Controller("pickup-mtaani")
export class PickupMtaaniController {
  private readonly logger = new Logger(PickupMtaaniController.name)

  constructor(
    private pickupMtaaniService: PickupMtaaniService,
    private paymentVerificationService: PaymentVerificationService,
    private prisma: PrismaService
  ) {}

  /**
   * Get all packages for a specific retailer
   * Combines our database records with real-time Pick Up Mtaani data
   */
  @UseGuards(JwtAuthGuard)
  @Get("retailer/packages")
  async getRetailerPackages(@Req() req: any): Promise<RetailerPackageDto[]> {
    try {
      // Try multiple possible locations for user ID
      const retailerId = req.user?.userId || req.user?.sub || req.user?.id

      console.log(`📦 [GET_RETAILER_PACKAGES] Request user object:`, req.user)
      console.log(
        `📦 [GET_RETAILER_PACKAGES] Fetching packages for retailer: ${retailerId}`
      )

      if (!retailerId) {
        throw new Error(
          "Retailer ID not found in request. User might not be authenticated."
        )
      }

      // Simplified query: Get all confirmed orders with order items
      // We'll filter for retailer-specific packages in the processing logic
      const orders = await this.prisma.order.findMany({
        where: {
          status: {
            in: [
              "confirmed",
              "processing",
              "shipped",
              "completed",
              "delivered",
            ],
          },
        },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })

      console.log(
        `📦 [GET_RETAILER_PACKAGES] Found ${orders.length} total orders`
      )

      // Filter for orders that have this retailer's products
      const retailerOrders = orders.filter((order) =>
        order.orderItems.some((item) => item.product?.retailerId === retailerId)
      )

      console.log(
        `📦 [GET_RETAILER_PACKAGES] Filtered to ${retailerOrders.length} orders for retailer`
      )

      // Log orders with shippingAddress
      retailerOrders.forEach((order) => {
        const shippingAddress = order.shippingAddress as any
        const packages = shippingAddress?.pickupMtaaniPackages || []
        console.log(
          `📦 [GET_RETAILER_PACKAGES] Order ${order.id}: ${packages.length} packages in shippingAddress`
        )
        if (packages.length > 0) {
          packages.forEach((pkg: any) => {
            console.log(
              `📦 [GET_RETAILER_PACKAGES]   - Package: ${pkg.receiptNo}, Retailer: ${pkg.retailerId}`
            )
          })
        }
      })

      // Get all packages from Pick Up Mtaani for real-time status
      const allPickupMtaaniPackages =
        await this.pickupMtaaniService.getAllBusinessPackages()

      // Create a map for quick lookup
      const pickupMtaaniMap = new Map(
        allPickupMtaaniPackages.map((pkg) => [pkg.id, pkg])
      )

      // Extract and merge package data
      const retailerPackages: RetailerPackageDto[] = []

      for (const order of retailerOrders) {
        const shippingAddress = order.shippingAddress as any
        const packages = shippingAddress?.pickupMtaaniPackages || []

        // Filter packages for this retailer
        const retailerSpecificPackages = packages.filter(
          (pkg: any) => pkg.retailerId === retailerId
        )

        console.log(
          `📦 [GET_RETAILER_PACKAGES] Order ${order.id}: ${retailerSpecificPackages.length} packages for this retailer`
        )

        for (const pkg of retailerSpecificPackages) {
          // Get real-time data from Pick Up Mtaani
          const liveData = pickupMtaaniMap.get(pkg.packageId)

          console.log(
            `📦 [GET_RETAILER_PACKAGES] Processing package ${pkg.receiptNo}`
          )
          console.log(
            `📦 [GET_RETAILER_PACKAGES]   - Package ID: ${pkg.packageId}`
          )
          console.log(
            `📦 [GET_RETAILER_PACKAGES]   - Live data found: ${!!liveData}`
          )
          console.log(
            `📦 [GET_RETAILER_PACKAGES]   - Status: ${liveData?.state || pkg.status}`
          )

          // Get retailer's items from this order
          const retailerItems = order.orderItems
            .filter((item) => item.product?.retailerId === retailerId)
            .map((item) => ({
              productId: item.productId,
              productName: item.title || item.product?.name || "Unknown",
              quantity: item.quantity,
              price: Number(item.totalPrice),
            }))

          console.log(
            `📦 [GET_RETAILER_PACKAGES]   - Items: ${retailerItems.length}`
          )

          retailerPackages.push({
            // From our database
            orderId: order.id,
            retailerId: pkg.retailerId,
            retailerName: pkg.retailerName,
            packageValue: pkg.packageValue,
            packageName: pkg.packageName,
            customerName: pkg.customerName || order.customerEmail,
            customerPhone: pkg.customerPhone || order.customerPhone || "N/A",
            items: retailerItems,

            // From Pick Up Mtaani (with fallback to stored data)
            packageId: pkg.packageId,
            receiptNo: pkg.receiptNo,
            deliveryFee: liveData?.delivery_fee || pkg.deliveryFee,
            senderAgentId: pkg.senderAgentId,
            receiverAgentId: pkg.receiverAgentId,
            status: liveData?.state || pkg.status, // Real-time status or fallback
            createdAt: pkg.createdAt,
            updatedAt: liveData?.updatedAt,

            // Order details
            orderCreatedAt: order.createdAt.toISOString(),
            orderStatus: order.status,
            paymentStatus: order.paymentStatus || "paid",
          })
        }
      }

      console.log(
        `📦 [GET_RETAILER_PACKAGES] Returning ${retailerPackages.length} packages total`
      )

      return retailerPackages
    } catch (error) {
      console.error(
        "❌ [GET_RETAILER_PACKAGES] Error fetching packages:",
        error
      )
      console.error("❌ [GET_RETAILER_PACKAGES] Error stack:", error.stack)
      throw error
    }
  }

  /**
   * Get packages for a specific retailer by retailer ID (admin use)
   */
  @UseGuards(JwtAuthGuard)
  @Get("retailer/:retailerId/packages")
  async getRetailerPackagesByRetailerId(
    @Param("retailerId") retailerId: string
  ): Promise<RetailerPackageDto[]> {
    // Similar logic but for admin viewing any retailer's packages
    const orders = await this.prisma.order.findMany({
      where: {
        orderItems: {
          some: {
            product: {
              retailerId: retailerId,
            },
          },
        },
        status: {
          in: ["confirmed", "processing", "shipped", "completed"],
        },
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                retailerId: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const allPickupMtaaniPackages =
      await this.pickupMtaaniService.getAllBusinessPackages()
    const pickupMtaaniMap = new Map(
      allPickupMtaaniPackages.map((pkg) => [pkg.id, pkg])
    )

    const retailerPackages: RetailerPackageDto[] = []

    for (const order of orders) {
      const shippingAddress = order.shippingAddress as any
      const packages = shippingAddress?.pickupMtaaniPackages || []

      const retailerSpecificPackages = packages.filter(
        (pkg: any) => pkg.retailerId === retailerId
      )

      for (const pkg of retailerSpecificPackages) {
        const liveData = pickupMtaaniMap.get(pkg.packageId)

        const retailerItems = order.orderItems
          .filter((item) => item.product?.retailerId === retailerId)
          .map((item) => ({
            productId: item.productId,
            productName: item.title || item.product?.name || "Unknown",
            quantity: item.quantity,
            price: Number(item.totalPrice),
          }))

        retailerPackages.push({
          orderId: order.id,
          retailerId: pkg.retailerId,
          retailerName: pkg.retailerName,
          packageValue: pkg.packageValue,
          packageName: pkg.packageName,
          customerName: pkg.customerName || order.customerEmail,
          customerPhone: pkg.customerPhone || order.customerPhone || "N/A",
          items: retailerItems,
          packageId: pkg.packageId,
          receiptNo: pkg.receiptNo,
          deliveryFee: liveData?.delivery_fee || pkg.deliveryFee,
          senderAgentId: pkg.senderAgentId,
          receiverAgentId: pkg.receiverAgentId,
          status: liveData?.state || pkg.status,
          createdAt: pkg.createdAt,
          updatedAt: liveData?.updatedAt,
          orderCreatedAt: order.createdAt.toISOString(),
          orderStatus: order.status,
          paymentStatus: order.paymentStatus || "paid",
        })
      }
    }

    return retailerPackages
  }

  /**
   * Get package status by receipt number
   */
  @UseGuards(JwtAuthGuard)
  @Get("package/:receiptNo")
  async getPackageByReceipt(@Param("receiptNo") receiptNo: string) {
    const packageData =
      await this.pickupMtaaniService.getPackageByIdentifier(receiptNo)

    if (!packageData) {
      return {
        success: false,
        message: "Package not found",
      }
    }

    return {
      success: true,
      data: packageData,
    }
  }

  /**
   * Register package payment for automatic verification
   * Called after payment initiation to start background verification
   */
  @UseGuards(JwtAuthGuard)
  @Post("register-payment")
  async registerPaymentForVerification(
    @Body() body: { packageId: number; orderId: string },
    @Req() req: any
  ) {
    try {
      const retailerId = req.user?.userId || req.user?.sub || req.user?.id

      this.logger.log(
        `📝 [REGISTER_PAYMENT] Registering package ${body.packageId} for verification`
      )

      // Check if already in queue
      const existing = await this.prisma.paymentVerificationQueue.findFirst({
        where: {
          packageId: body.packageId,
          status: "pending",
        },
      })

      if (existing) {
        this.logger.log(
          `⏭️ [REGISTER_PAYMENT] Package ${body.packageId} already in verification queue`
        )
        return {
          success: true,
          message: "Package already registered for verification",
          data: existing,
        }
      }

      // Add to verification queue
      const verification = await this.prisma.paymentVerificationQueue.create({
        data: {
          packageId: body.packageId,
          orderId: body.orderId,
          retailerId: retailerId,
          status: "pending",
        },
      })

      this.logger.log(
        `✅ [REGISTER_PAYMENT] Successfully registered package ${body.packageId} for auto-verification`
      )

      return {
        success: true,
        message:
          "Payment registered. We'll verify automatically in the background.",
        data: verification,
      }
    } catch (error) {
      this.logger.error(`❌ [REGISTER_PAYMENT] Error:`, error.message)
      return {
        success: false,
        message: "Failed to register payment for verification",
        error: error.message,
      }
    }
  }

  /**
   * Get verification status for a package
   */
  @UseGuards(JwtAuthGuard)
  @Get("verification-status/:packageId")
  async getVerificationStatus(@Param("packageId") packageId: string) {
    const status = await this.paymentVerificationService.getVerificationStatus(
      parseInt(packageId)
    )
    return {
      success: true,
      data: status,
    }
  }

  /**
   * Test endpoint to get all packages (admin only)
   */
  @UseGuards(JwtAuthGuard)
  @Get("packages/all")
  async getAllPackages() {
    const packages = await this.pickupMtaaniService.getAllBusinessPackages()
    return {
      success: true,
      count: packages.length,
      data: packages,
    }
  }
}
