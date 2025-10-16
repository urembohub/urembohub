import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PrismaService } from "../prisma/prisma.service"
import { EscrowService } from "../escrow/escrow.service"
import { EmailService } from "../email/email.service"
import { EnhancedCommissionService } from "../commission/enhanced-commission.service"
import { CommissionQueueService } from "../commission/queue/commission-queue.service"
import { PickupMtaaniService } from "../pickup-mtaani/pickup-mtaani.service"
import { PackageTrackingQueueService } from "../pickup-mtaani/package-tracking-queue.service"
import axios from "axios"

export interface PaystackPaymentData {
  amount: number
  currency: string
  email: string
  reference?: string
  customerName?: string
  customerPhone?: string
  metadata?: any
}

export interface PaymentGroupData {
  orderId: string
  totalAmount: number
  currency: string
  customerEmail: string
  vendors: Array<{
    vendorId: string
    vendorEmail: string
    vendorName: string
    amount: number
    percentage: number
  }>
  platformFee: number
  platformFeePercentage: number
}

export interface PaystackResponse {
  success: boolean
  reference: string
  authorization_url?: string
  access_code?: string
  message?: string
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)
  private readonly paystackSecretKey: string
  private readonly paystackPublicKey: string
  private readonly paystackBaseUrl = "https://api.paystack.co"
  private failedPackages: any[] = []

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private escrowService: EscrowService,
    private emailService: EmailService,
    private enhancedCommissionService: EnhancedCommissionService,
    private commissionQueueService: CommissionQueueService,
    private pickupMtaaniService: PickupMtaaniService,
    private packageTrackingQueueService: PackageTrackingQueueService
  ) {
    this.paystackSecretKey = this.configService.get<string>(
      "PAYSTACK_SECRET_KEY"
    )
    this.paystackPublicKey = this.configService.get<string>(
      "PAYSTACK_PUBLIC_KEY"
    )

    if (!this.paystackSecretKey || !this.paystackPublicKey) {
      this.logger.error("Paystack keys not configured")
    }
  }

  /**
   * Normalize tracking link to ensure it has proper protocol
   * @param trackingLink The tracking link from Pick Up Mtaani
   * @returns Normalized tracking link with https:// protocol
   */
  private normalizeTrackingLink(trackingLink: string | undefined): string | undefined {
    if (!trackingLink) return undefined;
    
    // If it already has a protocol, return as is
    if (trackingLink.startsWith('http://') || trackingLink.startsWith('https://')) {
      return trackingLink;
    }
    
    // Add https:// protocol
    return `https://${trackingLink}`;
  }

  /**
   * Initialize payment with Paystack Payment Groups for multi-vendor orders
   */
  async initializePaymentGroup(
    paymentGroupData: PaymentGroupData
  ): Promise<PaystackResponse> {
    try {
      console.log(
        "💰 [PAYMENT_GROUP] ==========================================="
      )
      console.log("💰 [PAYMENT_GROUP] INITIALIZING PAYMENT GROUP")
      console.log(
        "💰 [PAYMENT_GROUP] ==========================================="
      )
      console.log("💰 [PAYMENT_GROUP] Order ID:", paymentGroupData.orderId)
      console.log(
        "💰 [PAYMENT_GROUP] Customer Email:",
        paymentGroupData.customerEmail
      )
      console.log("💰 [PAYMENT_GROUP] Currency:", paymentGroupData.currency)

      // Calculate total amounts
      const totalVendorAmount = paymentGroupData.vendors.reduce(
        (sum, vendor) => sum + vendor.amount,
        0
      )
      const totalAmount = totalVendorAmount + paymentGroupData.platformFee

      console.log("💰 [PAYMENT_GROUP] PAYMENT BREAKDOWN:")
      console.log(
        `💰 [PAYMENT_GROUP]   - Total Order Amount (incl. platform fee): ${paymentGroupData.currency} ${paymentGroupData.totalAmount}`
      )
      console.log(
        `💰 [PAYMENT_GROUP]   - Amount to Charge Customer: ${paymentGroupData.currency} ${totalVendorAmount}`
      )
      console.log(
        `💰 [PAYMENT_GROUP]   - Vendors Total (to be split): ${paymentGroupData.currency} ${totalVendorAmount}`
      )
      console.log(
        `💰 [PAYMENT_GROUP]   - Platform Fee (collected separately): ${paymentGroupData.currency} ${paymentGroupData.platformFee} (${paymentGroupData.platformFeePercentage}%)`
      )
      console.log(
        `💰 [PAYMENT_GROUP]   - Number of Vendors: ${paymentGroupData.vendors.length}`
      )

      console.log("💰 [PAYMENT_GROUP] VENDOR DETAILS:")
      paymentGroupData.vendors.forEach((vendor, index) => {
        console.log(`💰 [PAYMENT_GROUP]   Vendor ${index + 1}:`)
        console.log(`💰 [PAYMENT_GROUP]     - ID: ${vendor.vendorId}`)
        console.log(`💰 [PAYMENT_GROUP]     - Name: ${vendor.vendorName}`)
        console.log(`💰 [PAYMENT_GROUP]     - Email: ${vendor.vendorEmail}`)
        console.log(
          `💰 [PAYMENT_GROUP]     - Amount: ${paymentGroupData.currency} ${vendor.amount}`
        )
        console.log(
          `💰 [PAYMENT_GROUP]     - Percentage: ${vendor.percentage}%`
        )
      })

      // Create payment group data for Paystack
      // NOTE: We use the TOTAL VENDOR AMOUNT (not including platform fee) for the transaction
      // The platform fee will be handled separately after payment settlement
      const paymentGroup = {
        name: `Order ${paymentGroupData.orderId} - Multi-Vendor Payment`,
        description: `Payment split for order with ${paymentGroupData.vendors.length} vendors`,
        amount: totalVendorAmount * 100, // Convert to kobo - using vendor total only
        currency: paymentGroupData.currency,
        email: paymentGroupData.customerEmail,
        reference: `group_${paymentGroupData.orderId}_${Date.now()}`,
        // NOTE: Removed transaction_charge - it was causing Paystack to deduct the fee BEFORE splitting
        // This caused: amount (1754) - transaction_charge (175.4) = 1578.6, but vendors need 1750
        // Platform fee will be collected separately after settlement
        metadata: {
          orderId: paymentGroupData.orderId,
          vendorCount: paymentGroupData.vendors.length,
          platformFeePercentage: paymentGroupData.platformFeePercentage,
          platformFee: paymentGroupData.platformFee,
          vendors: paymentGroupData.vendors.map((v) => ({
            id: v.vendorId,
            name: v.vendorName,
            amount: v.amount,
            percentage: v.percentage,
          })),
        },
        split_code: await this.createSplitCode(paymentGroupData),
        callback_url: `${this.configService.get("BACKEND_URL") || "http://localhost:3000"}/api/paystack/checkout/webhook`,
      }

      const response = await axios.post(
        `${this.paystackBaseUrl}/transaction/initialize`,
        paymentGroup,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            "Content-Type": "application/json",
          },
        }
      )

      console.log("✅ [PAYMENT_GROUP] Payment group initialized successfully")
      return {
        success: true,
        reference: response.data.data.reference,
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        message: response.data.message,
      }
    } catch (error) {
      console.error(
        "❌ [PAYMENT_GROUP] Payment group initialization failed:",
        error.response?.data || error.message
      )
      return {
        success: false,
        reference: `group_${paymentGroupData.orderId}`,
        message:
          error.response?.data?.message ||
          "Payment group initialization failed",
      }
    }
  }

  /**
   * Create Paystack split code for vendor payments
   */
  private async createSplitCode(
    paymentGroupData: PaymentGroupData
  ): Promise<string> {
    try {
      console.log("🔀 [SPLIT_CODE] ===========================================")
      console.log("🔀 [SPLIT_CODE] CREATING PAYSTACK SPLIT CODE")
      console.log("🔀 [SPLIT_CODE] ===========================================")
      console.log("🔀 [SPLIT_CODE] Order ID:", paymentGroupData.orderId)
      console.log(
        "🔀 [SPLIT_CODE] Number of Vendors:",
        paymentGroupData.vendors.length
      )

      // Create subaccounts for vendors (if they don't exist)
      console.log(
        "🔀 [SPLIT_CODE] Step 1: Ensuring all vendors have subaccounts..."
      )
      const subaccountPromises = paymentGroupData.vendors.map(
        async (vendor, index) => {
          console.log(
            `🔀 [SPLIT_CODE]   Processing vendor ${index + 1}/${paymentGroupData.vendors.length}: ${vendor.vendorName}`
          )
          return await this.ensureVendorSubaccount(
            vendor.vendorId,
            vendor.vendorEmail,
            vendor.vendorName
          )
        }
      )

      const subaccounts = await Promise.all(subaccountPromises)
      console.log("🔀 [SPLIT_CODE] All subaccounts processed successfully")

      // Calculate platform percentage
      const platformPercentage = paymentGroupData.platformFeePercentage
      const totalVendorPercentage = paymentGroupData.vendors.reduce(
        (sum, vendor) => sum + vendor.percentage,
        0
      )

      console.log("🔀 [SPLIT_CODE] PLATFORM COMMISSION:")
      console.log(`🔀 [SPLIT_CODE]   - Platform Fee %: ${platformPercentage}%`)
      console.log(
        `🔀 [SPLIT_CODE]   - Platform Fee Amount: ${paymentGroupData.currency} ${paymentGroupData.platformFee}`
      )
      console.log(
        `🔀 [SPLIT_CODE]   - Total Vendor %: ${totalVendorPercentage}% (should be 100%)`
      )
      console.log(
        `🔀 [SPLIT_CODE]   - Platform fee: Collected separately (NOT via transaction_charge)`
      )

      // Create split code with vendor subaccounts only (100% of payment amount)
      // Platform fee will be collected separately after settlement
      const splitData = {
        name: `Order ${paymentGroupData.orderId} Split`,
        type: "percentage",
        currency: paymentGroupData.currency,
        subaccounts: subaccounts.map((subaccount, index) => ({
          subaccount: subaccount.subaccount_code,
          share: paymentGroupData.vendors[index].percentage,
        })),
      }

      console.log("🔀 [SPLIT_CODE] SPLIT CODE DATA:")
      console.log("🔀 [SPLIT_CODE]   - Name:", splitData.name)
      console.log("🔀 [SPLIT_CODE]   - Type:", splitData.type)
      console.log("🔀 [SPLIT_CODE]   - Currency:", splitData.currency)
      console.log("🔀 [SPLIT_CODE]   - Subaccounts (Vendors Only):")
      splitData.subaccounts.forEach((sub, index) => {
        console.log(
          `🔀 [SPLIT_CODE]     ${index + 1}. VENDOR: ${sub.subaccount}, Share: ${sub.share}%`
        )
      })
      console.log(
        "🔀 [SPLIT_CODE]   - Platform fee: Collected separately, NOT included in this split"
      )

      console.log(
        "🔀 [SPLIT_CODE] Calling Paystack API to create split code..."
      )
      const response = await axios.post(
        `${this.paystackBaseUrl}/split`,
        splitData,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            "Content-Type": "application/json",
          },
        }
      )

      console.log("🔀 [SPLIT_CODE] PAYSTACK RESPONSE:")
      console.log("🔀 [SPLIT_CODE]   - Status:", response.data.status)
      console.log("🔀 [SPLIT_CODE]   - Message:", response.data.message)
      console.log(
        "🔀 [SPLIT_CODE]   - Split Code:",
        response.data.data?.split_code
      )
      console.log("🔀 [SPLIT_CODE]   - Split ID:", response.data.data?.id)
      console.log(
        "🔀 [SPLIT_CODE]   - Split Name:",
        response.data.data?.split_name
      )
      console.log(
        "🔀 [SPLIT_CODE]   - Split Type:",
        response.data.data?.split_type
      )
      console.log("🔀 [SPLIT_CODE]   - Currency:", response.data.data?.currency)
      console.log(
        "🔀 [SPLIT_CODE]   - Created At:",
        response.data.data?.createdAt
      )
      console.log(
        "🔀 [SPLIT_CODE]   - Updated At:",
        response.data.data?.updatedAt
      )

      console.log("✅ [SPLIT_CODE] Split code created successfully!")
      console.log("🔀 [SPLIT_CODE] ===========================================")
      return response.data.data.split_code
    } catch (error) {
      console.error(
        "❌ [PAYMENT_GROUP] Failed to create split code:",
        error.response?.data || error.message
      )
      throw new Error("Failed to create payment split")
    }
  }

  /**
   * Ensure vendor has a Paystack subaccount
   */
  private async ensureVendorSubaccount(
    vendorId: string,
    vendorEmail: string,
    vendorName: string
  ): Promise<any> {
    try {
      console.log("🏦 [SUBACCOUNT] ===========================================")
      console.log("🏦 [SUBACCOUNT] CHECKING VENDOR SUBACCOUNT")
      console.log("🏦 [SUBACCOUNT] ===========================================")
      console.log("🏦 [SUBACCOUNT] Vendor ID:", vendorId)
      console.log("🏦 [SUBACCOUNT] Vendor Name:", vendorName)
      console.log("🏦 [SUBACCOUNT] Vendor Email:", vendorEmail)

      // Check if vendor already has subaccount
      const existingProfile = await this.prisma.profile.findUnique({
        where: { id: vendorId },
        select: {
          paystackSubaccountId: true,
          paystackSubaccountStatus: true,
          paystackSubaccountCreatedAt: true,
        },
      })

      if (existingProfile?.paystackSubaccountId) {
        console.log("🏦 [SUBACCOUNT] EXISTING SUBACCOUNT FOUND:")
        console.log(
          "🏦 [SUBACCOUNT]   - Subaccount ID:",
          existingProfile.paystackSubaccountId
        )
        console.log(
          "🏦 [SUBACCOUNT]   - Status:",
          existingProfile.paystackSubaccountStatus || "unknown"
        )
        console.log(
          "🏦 [SUBACCOUNT]   - Created At:",
          existingProfile.paystackSubaccountCreatedAt || "unknown"
        )
        console.log("🏦 [SUBACCOUNT] Using existing subaccount")
        return { subaccount_code: existingProfile.paystackSubaccountId }
      }

      console.log("🏦 [SUBACCOUNT] NO EXISTING SUBACCOUNT FOUND")
      console.log("🏦 [SUBACCOUNT] Creating new subaccount...")

      // For testing, use a mock subaccount approach
      // In production, you should create real subaccounts via Paystack dashboard
      console.log("🏦 [SUBACCOUNT] Using mock subaccount for testing...")

      // Create a mock subaccount response
      const mockSubaccount = {
        subaccount_code: `ACCT_mock_${vendorId.slice(-8)}`,
        id: `mock_${vendorId}`,
        business_name: vendorName,
        settlement_bank: "044",
        account_number: "1234567890",
        percentage_charge: 0,
        primary_contact_email: vendorEmail,
        primary_contact_name: vendorName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Save mock subaccount to database
      await this.prisma.profile.update({
        where: { id: vendorId },
        data: {
          paystackSubaccountId: mockSubaccount.subaccount_code,
          paystackSubaccountStatus: "active",
          paystackSubaccountCreatedAt: new Date(),
          paystackSettlementBank: mockSubaccount.settlement_bank,
          paystackAccountNumber: mockSubaccount.account_number,
          paystackBusinessName: mockSubaccount.business_name,
          paystackPrimaryContactEmail: mockSubaccount.primary_contact_email,
          paystackPrimaryContactName: mockSubaccount.primary_contact_name,
        },
      })

      console.log(
        "✅ [SUBACCOUNT] Mock subaccount created and saved successfully!"
      )
      console.log("🏦 [SUBACCOUNT] ===========================================")
      return mockSubaccount
    } catch (error) {
      console.error(
        "❌ [PAYMENT_GROUP] Failed to create subaccount for vendor:",
        vendorName,
        error.response?.data || error.message
      )
      throw new Error(`Failed to create subaccount for vendor: ${vendorName}`)
    }
  }

  /**
   * Initialize payment with Paystack (legacy method for single vendor orders)
   */
  async initializePayment(
    paymentData: PaystackPaymentData
  ): Promise<PaystackResponse> {
    try {
      console.log(
        "💳 [INITIALIZE_PAYMENT] ==========================================="
      )
      console.log("💳 [INITIALIZE_PAYMENT] INITIALIZING STANDARD PAYMENT")
      console.log(
        "💳 [INITIALIZE_PAYMENT] ==========================================="
      )
      console.log("💳 [INITIALIZE_PAYMENT] Payment Data:")
      console.log("💳 [INITIALIZE_PAYMENT]   - Amount:", paymentData.amount)
      console.log("💳 [INITIALIZE_PAYMENT]   - Currency:", paymentData.currency)
      console.log("💳 [INITIALIZE_PAYMENT]   - Email:", paymentData.email)
      console.log(
        "💳 [INITIALIZE_PAYMENT]   - Customer Name:",
        paymentData.customerName
      )
      console.log(
        "💳 [INITIALIZE_PAYMENT]   - Customer Phone:",
        paymentData.customerPhone
      )
      console.log(
        "💳 [INITIALIZE_PAYMENT]   - Reference:",
        paymentData.reference
      )
      console.log(
        "💳 [INITIALIZE_PAYMENT]   - Metadata:",
        JSON.stringify(paymentData.metadata, null, 2)
      )

      // Generate reference if not provided
      const reference =
        paymentData.reference ||
        `WKS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const paymentRequest = {
        amount: paymentData.amount * 100, // Convert to kobo
        currency: paymentData.currency,
        email: paymentData.email,
        reference: reference,
        callback_url: `${this.configService.get("BACKEND_URL") || "http://localhost:3000"}/api/paystack/checkout/webhook`,
        metadata: {
          ...paymentData.metadata,
          customer_name: paymentData.customerName,
          customer_phone: paymentData.customerPhone,
        },
      }

      console.log("💳 [INITIALIZE_PAYMENT] Paystack Request:")
      console.log(
        "💳 [INITIALIZE_PAYMENT]   - Amount (kobo):",
        paymentRequest.amount
      )
      console.log(
        "💳 [INITIALIZE_PAYMENT]   - Currency:",
        paymentRequest.currency
      )
      console.log("💳 [INITIALIZE_PAYMENT]   - Email:", paymentRequest.email)
      console.log(
        "💳 [INITIALIZE_PAYMENT]   - Reference:",
        paymentRequest.reference
      )
      console.log(
        "💳 [INITIALIZE_PAYMENT]   - Callback URL:",
        paymentRequest.callback_url
      )

      const response = await axios.post(
        `${this.paystackBaseUrl}/transaction/initialize`,
        paymentRequest,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            "Content-Type": "application/json",
          },
        }
      )

      console.log("💳 [INITIALIZE_PAYMENT] Paystack Response:")
      console.log("💳 [INITIALIZE_PAYMENT]   - Status:", response.data.status)
      console.log("💳 [INITIALIZE_PAYMENT]   - Message:", response.data.message)
      console.log(
        "💳 [INITIALIZE_PAYMENT]   - Reference:",
        response.data.data?.reference
      )
      console.log(
        "💳 [INITIALIZE_PAYMENT]   - Authorization URL:",
        response.data.data?.authorization_url
      )
      console.log(
        "💳 [INITIALIZE_PAYMENT]   - Access Code:",
        response.data.data?.access_code
      )

      if (!response.data.status) {
        console.error(
          "❌ [INITIALIZE_PAYMENT] Paystack returned error:",
          response.data
        )
        return {
          success: false,
          reference: reference,
          message: response.data.message || "Payment initialization failed",
        }
      }

      console.log("✅ [INITIALIZE_PAYMENT] Payment initialized successfully!")
      console.log(
        "💳 [INITIALIZE_PAYMENT] ==========================================="
      )

      return {
        success: true,
        reference: response.data.data.reference,
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        message: response.data.message,
      }
    } catch (error) {
      console.error(
        "❌ [INITIALIZE_PAYMENT] Payment initialization failed:",
        error.response?.data || error.message
      )
      this.logger.error(
        "Paystack payment initialization failed:",
        error.response?.data || error.message
      )
      return {
        success: false,
        reference: paymentData.reference || `WKS_${Date.now()}`,
        message:
          error.response?.data?.message || "Payment initialization failed",
      }
    }
  }

  /**
   * Verify payment with Paystack
   */
  async verifyPayment(
    reference: string
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await axios.get(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        }
      )

      const transaction = response.data.data

      if (transaction.status === "success") {
        return {
          success: true,
          data: transaction,
          message: "Payment verified successfully",
        }
      } else {
        return {
          success: false,
          message: "Payment not successful",
        }
      }
    } catch (error) {
      this.logger.error(
        "Paystack payment verification failed:",
        error.response?.data || error.message
      )
      return {
        success: false,
        message: error.response?.data?.message || "Payment verification failed",
      }
    }
  }

  /**
   * Process payment and initialize escrow
   * Automatically uses Payment Groups for multi-vendor orders
   */
  async processPayment(
    orderId: string,
    paymentData: PaystackPaymentData
  ): Promise<{
    success: boolean
    data?: {
      reference: string
      authorization_url: string
      access_code: string
    }
    message?: string
  }> {
    try {
      console.log(
        "💳 [PAYMENT_PROCESS] ==========================================="
      )
      console.log("💳 [PAYMENT_PROCESS] PROCESSING PAYMENT")
      console.log(
        "💳 [PAYMENT_PROCESS] ==========================================="
      )
      console.log("💳 [PAYMENT_PROCESS] Order ID:", orderId)
      console.log("💳 [PAYMENT_PROCESS] Customer Email:", paymentData.email)
      console.log("💳 [PAYMENT_PROCESS] Amount:", paymentData.amount)
      console.log("💳 [PAYMENT_PROCESS] Currency:", paymentData.currency)

      // Check if this is a multi-vendor order
      console.log(
        "💳 [PAYMENT_PROCESS] Step 1: Checking if order is multi-vendor..."
      )
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  retailer: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      businessName: true,
                      role: true,
                    },
                  },
                },
              },
            },
          },
          serviceAppointments: {
            include: {
              service: {
                include: {
                  vendor: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      businessName: true,
                      role: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      if (!order) {
        console.error("❌ [PAYMENT_PROCESS] Order not found:", orderId)
        return {
          success: false,
          message: "Order not found",
        }
      }

      // Count unique vendors
      const vendors = new Set()
      order.orderItems.forEach((item) => {
        if (item.product?.retailer) {
          vendors.add(item.product.retailer.id)
        }
      })
      order.serviceAppointments.forEach((appointment) => {
        if (appointment.service?.vendor) {
          vendors.add(appointment.service.vendor.id)
        }
      })

      const isMultiVendor = vendors.size > 1
      console.log(
        "💳 [PAYMENT_PROCESS] Order Type:",
        isMultiVendor ? "MULTI-VENDOR" : "SINGLE VENDOR"
      )
      console.log("💳 [PAYMENT_PROCESS] Number of Vendors:", vendors.size)

      let paymentResponse

      if (isMultiVendor) {
        console.log(
          "💳 [PAYMENT_PROCESS] Step 2: Using Payment Groups for multi-vendor order..."
        )

        // Calculate payment splits for multi-vendor order
        const paymentGroupData = await this.calculatePaymentSplits(orderId)

        console.log("💰 [PAYMENT_PROCESS] PAYMENT SPLITS CALCULATED:")
        console.log(
          `💰 [PAYMENT_PROCESS]   - Total Amount: ${paymentGroupData.currency} ${paymentGroupData.totalAmount}`
        )
        console.log(
          `💰 [PAYMENT_PROCESS]   - Platform Fee: ${paymentGroupData.currency} ${paymentGroupData.platformFee} (${paymentGroupData.platformFeePercentage}%)`
        )
        console.log(
          `💰 [PAYMENT_PROCESS]   - Number of Vendors: ${paymentGroupData.vendors.length}`
        )

        // Initialize Payment Group
        paymentResponse = await this.initializePaymentGroup(paymentGroupData)

        if (paymentResponse.success) {
          console.log(
            "✅ [PAYMENT_PROCESS] Payment Group initialized successfully!"
          )
        } else {
          console.error(
            "❌ [PAYMENT_PROCESS] Payment Group initialization failed:",
            paymentResponse.message
          )
        }
      } else {
        console.log(
          "💳 [PAYMENT_PROCESS] Step 2: Using standard payment for single vendor order..."
        )

        // Use standard payment for single vendor
        paymentResponse = await this.initializePayment(paymentData)

        if (paymentResponse.success) {
          console.log(
            "✅ [PAYMENT_PROCESS] Standard payment initialized successfully!"
          )
        } else {
          console.error(
            "❌ [PAYMENT_PROCESS] Standard payment initialization failed:",
            paymentResponse.message
          )
        }
      }

      if (!paymentResponse.success) {
        return {
          success: false,
          message: paymentResponse.message || "Payment initialization failed",
        }
      }

      // Store payment reference in order
      console.log(
        "💳 [PAYMENT_PROCESS] Step 3: Storing payment reference in order..."
      )
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          paystackReference: paymentResponse.reference,
          status: "pending",
        },
      })

      console.log("✅ [PAYMENT_PROCESS] Payment reference stored successfully!")
      console.log(
        "💳 [PAYMENT_PROCESS] ==========================================="
      )

      return {
        success: true,
        data: {
          reference: paymentResponse.reference,
          authorization_url: paymentResponse.authorization_url,
          access_code: paymentResponse.access_code || "",
        },
        message: `Payment initialized successfully using ${isMultiVendor ? "Payment Groups" : "Standard Payment"}`,
      }
    } catch (error) {
      console.error("❌ [PAYMENT_PROCESS] Payment processing failed:", error)
      this.logger.error("Payment processing failed:", error)
      return {
        success: false,
        message: "Payment processing failed",
      }
    }
  }

  /**
   * Calculate payment splits for multi-vendor orders
   */
  async calculatePaymentSplits(orderId: string): Promise<PaymentGroupData> {
    try {
      console.log(
        "💰 [PAYMENT_GROUP] Calculating payment splits for order:",
        orderId
      )

      // Get order with all items and their vendors
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  retailer: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      businessName: true,
                      role: true,
                    },
                  },
                },
              },
            },
          },
          serviceAppointments: {
            include: {
              service: {
                include: {
                  vendor: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      businessName: true,
                      role: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      if (!order) {
        throw new Error("Order not found")
      }

      // Calculate vendor amounts
      const vendorAmounts = new Map<
        string,
        {
          vendorId: string
          vendorEmail: string
          vendorName: string
          amount: number
          items: string[]
        }
      >()

      // Process product items
      order.orderItems.forEach((item) => {
        if (item.product?.retailer) {
          const vendor = item.product.retailer
          const existing = vendorAmounts.get(vendor.id) || {
            vendorId: vendor.id,
            vendorEmail: vendor.email,
            vendorName: vendor.fullName || vendor.businessName || "Vendor",
            amount: 0,
            items: [],
          }

          existing.amount += Number(item.totalPrice)
          existing.items.push(item.title)
          vendorAmounts.set(vendor.id, existing)
        }
      })

      // Process service items
      order.serviceAppointments.forEach((appointment) => {
        if (appointment.service?.vendor) {
          const vendor = appointment.service.vendor
          const existing = vendorAmounts.get(vendor.id) || {
            vendorId: vendor.id,
            vendorEmail: vendor.email,
            vendorName: vendor.fullName || vendor.businessName || "Vendor",
            amount: 0,
            items: [],
          }

          existing.amount += Number(appointment.servicePrice)
          existing.items.push(appointment.service.name)
          vendorAmounts.set(vendor.id, existing)
        }
      })

      // Calculate total vendor amount (sum of all vendor amounts)
      const totalVendorAmount = Array.from(vendorAmounts.values()).reduce(
        (sum, vendor) => sum + vendor.amount,
        0
      )

      // Convert to array and calculate percentages based on vendor total (not order total)
      const vendors = Array.from(vendorAmounts.values()).map((vendor) => {
        const percentage = (vendor.amount / totalVendorAmount) * 100
        return {
          vendorId: vendor.vendorId,
          vendorEmail: vendor.vendorEmail,
          vendorName: vendor.vendorName,
          amount: vendor.amount,
          percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
        }
      })

      // Calculate platform fee (default 10%)
      const platformFeePercentage = 10
      const platformFee =
        (Number(order.totalAmount) * platformFeePercentage) / 100

      console.log("💰 [PAYMENT_GROUP] Payment split calculated:")
      vendors.forEach((vendor) => {
        console.log(
          `  - ${vendor.vendorName}: ${order.currency} ${vendor.amount} (${vendor.percentage}%)`
        )
      })
      console.log(
        `  - Platform Fee: ${order.currency} ${platformFee} (${platformFeePercentage}%)`
      )

      return {
        orderId: order.id,
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
        customerEmail: order.customerEmail,
        vendors,
        platformFee,
        platformFeePercentage,
      }
    } catch (error) {
      console.error(
        "❌ [PAYMENT_GROUP] Failed to calculate payment splits:",
        error
      )
      throw error
    }
  }

  /**
   * Handle payment callback and initialize escrow
   */
  async handlePaymentCallback(reference: string): Promise<{
    success: boolean
    orderId?: string
    message?: string
  }> {
    try {
      console.log(
        "💳 [PAYMENT_CALLBACK] ==========================================="
      )
      console.log("💳 [PAYMENT_CALLBACK] HANDLING PAYMENT CALLBACK")
      console.log(
        "💳 [PAYMENT_CALLBACK] ==========================================="
      )
      console.log("💳 [PAYMENT_CALLBACK] Payment Reference:", reference)
      console.log("💳 [PAYMENT_CALLBACK] Timestamp:", new Date().toISOString())

      // Verify payment with Paystack
      console.log(
        "💳 [PAYMENT_CALLBACK] Step 1: Verifying payment with Paystack..."
      )
      const verification = await this.verifyPayment(reference)

      if (!verification.success) {
        console.error(
          "❌ [PAYMENT_CALLBACK] Payment verification failed:",
          verification.message
        )
        this.logger.error("Payment verification failed:", verification.message)
        return {
          success: false,
          message: verification.message || "Payment verification failed",
        }
      }

      console.log("✅ [PAYMENT_CALLBACK] Payment verification successful")
      const paymentData = verification.data

      console.log("💳 [PAYMENT_CALLBACK] PAYMENT DATA:")
      console.log("💳 [PAYMENT_CALLBACK]   - Amount:", paymentData.amount)
      console.log("💳 [PAYMENT_CALLBACK]   - Currency:", paymentData.currency)
      console.log("💳 [PAYMENT_CALLBACK]   - Status:", paymentData.status)
      console.log(
        "💳 [PAYMENT_CALLBACK]   - Gateway Response:",
        paymentData.gateway_response
      )
      console.log("💳 [PAYMENT_CALLBACK]   - Channel:", paymentData.channel)
      console.log("💳 [PAYMENT_CALLBACK]   - Reference:", paymentData.reference)
      console.log(
        "💳 [PAYMENT_CALLBACK]   - Customer Email:",
        paymentData.customer?.email
      )
      console.log(
        "💳 [PAYMENT_CALLBACK]   - Customer Code:",
        paymentData.customer?.customer_code
      )

      // Find order by payment reference
      console.log(
        "💳 [PAYMENT_CALLBACK] Step 2: Finding order by payment reference..."
      )
      const order = await this.prisma.order.findFirst({
        where: { paystackReference: reference },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  retailer: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      businessName: true,
                      role: true,
                      deliveryDetails: true, // ✅ Include delivery details for package creation
                      pickupMtaaniBusinessDetails: true, // ✅ Include Pickup Mtaani business details
                    },
                  },
                },
              },
            },
          },
          serviceAppointments: {
            include: {
              service: {
                include: {
                  vendor: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      businessName: true,
                      role: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      if (!order) {
        console.error(
          "❌ [PAYMENT_CALLBACK] Order not found for reference:",
          reference
        )
        this.logger.error("Order not found for reference:", reference)
        return {
          success: false,
          message: "Order not found",
        }
      }

      console.log("✅ [PAYMENT_CALLBACK] Order found:", order.id)
      console.log("💳 [PAYMENT_CALLBACK] ORDER DETAILS:")
      console.log("💳 [PAYMENT_CALLBACK]   - Order ID:", order.id)
      console.log(
        "💳 [PAYMENT_CALLBACK]   - Customer Email:",
        order.customerEmail
      )
      console.log("💳 [PAYMENT_CALLBACK]   - Total Amount:", order.totalAmount)
      console.log("💳 [PAYMENT_CALLBACK]   - Currency:", order.currency)
      console.log("💳 [PAYMENT_CALLBACK]   - Current Status:", order.status)
      console.log(
        "💳 [PAYMENT_CALLBACK]   - Product Items:",
        order.orderItems.length
      )
      console.log(
        "💳 [PAYMENT_CALLBACK]   - Service Appointments:",
        order.serviceAppointments.length
      )

      // Check if this is a multi-vendor order
      const vendors = new Set()
      order.orderItems.forEach((item) => {
        if (item.product?.retailer) {
          vendors.add(
            `${item.product.retailer.role}:${item.product.retailer.businessName || item.product.retailer.fullName}`
          )
        }
      })
      order.serviceAppointments.forEach((appointment) => {
        if (appointment.service?.vendor) {
          vendors.add(
            `${appointment.service.vendor.role}:${appointment.service.vendor.businessName || appointment.service.vendor.fullName}`
          )
        }
      })

      const isMultiVendor = vendors.size > 1
      console.log(
        "💳 [PAYMENT_CALLBACK] PAYMENT TYPE:",
        isMultiVendor ? "MULTI-VENDOR ORDER" : "SINGLE VENDOR ORDER"
      )
      console.log(
        "💳 [PAYMENT_CALLBACK] VENDORS INVOLVED:",
        Array.from(vendors)
      )

      // Update order status to paid
      console.log("💳 [PAYMENT_CALLBACK] Step 3: Updating order status...")
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: "paid",
          paidAt: new Date(),
          confirmedAt: new Date(),
        },
      })
      console.log("✅ [PAYMENT_CALLBACK] Order status updated to paid")

      // Create Pick Up Mtaani packages for RETAILER product orders
      console.log(
        "💳 [PAYMENT_CALLBACK] Step 4: Creating Pick Up Mtaani packages for product orders..."
      )
      const packageResults = await this.createPickUpMtaaniPackages(order)
      console.log("✅ [PAYMENT_CALLBACK] Pick Up Mtaani packages processed")
      
      // Update order status based on package creation results
      await this.updateOrderStatusBasedOnPackages(order, packageResults)

      // Create escrow for VENDOR service payments
      console.log(
        "💳 [PAYMENT_CALLBACK] Step 5: Creating escrow for service payments..."
      )
      await this.createEscrowForServicePayments(order, reference)
      console.log("✅ [PAYMENT_CALLBACK] Escrow created successfully")

      // Process commission transactions
      console.log(
        "💳 [PAYMENT_CALLBACK] Step 6: Processing commission transactions..."
      )
      await this.processCommissionTransactions(order, reference)
      console.log(
        "✅ [PAYMENT_CALLBACK] Commission transactions processed successfully"
      )

      // Send payment success notifications
      console.log(
        "💳 [PAYMENT_CALLBACK] Step 7: Sending payment success notifications..."
      )
      await this.sendPaymentSuccessNotifications(order.id, reference)
      console.log("✅ [PAYMENT_CALLBACK] Payment success notifications sent")

      console.log(
        "🎉 [PAYMENT_CALLBACK] Payment callback processed successfully!"
      )
      console.log(
        "💳 [PAYMENT_CALLBACK] ==========================================="
      )

      return {
        success: true,
        orderId: order.id,
        message: "Payment processed and escrow initialized",
      }
    } catch (error) {
      console.error(
        "❌ [PAYMENT_CALLBACK] Payment callback handling failed:",
        error
      )
      this.logger.error("Payment callback handling failed:", error)
      return {
        success: false,
        message: "Payment callback handling failed",
      }
    }
  }

  /**
   * Process refund
   */
  async processRefund(
    orderId: string,
    reason: string
  ): Promise<{
    success: boolean
    message?: string
  }> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      })

      if (!order || !order.paystackReference) {
        return {
          success: false,
          message: "Order or payment reference not found",
        }
      }

      // Process refund through escrow service
      // TODO: Implement refund logic for escrow
      const refundSuccess = true

      return {
        success: refundSuccess,
        message: refundSuccess
          ? "Refund processed successfully"
          : "Refund processing failed",
      }
    } catch (error) {
      this.logger.error("Refund processing failed:", error)
      return {
        success: false,
        message: "Refund processing failed",
      }
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(): Promise<{
    totalTransactions: number
    totalAmount: number
    successfulTransactions: number
    failedTransactions: number
  }> {
    const stats = await this.prisma.order.aggregate({
      _count: { id: true },
      _sum: { totalAmount: true },
    })

    const successfulStats = await this.prisma.order.aggregate({
      where: { status: "confirmed" },
      _count: { id: true },
    })

    const failedStats = await this.prisma.order.aggregate({
      where: { status: "cancelled" },
      _count: { id: true },
    })

    return {
      totalTransactions: stats._count.id || 0,
      totalAmount: Number(stats._sum.totalAmount || 0),
      successfulTransactions: successfulStats._count.id || 0,
      failedTransactions: failedStats._count.id || 0,
    }
  }

  /**
   * Send payment success notifications to vendors, retailers, and manufacturers
   */
  private async sendPaymentSuccessNotifications(
    orderId: string,
    paymentReference: string
  ) {
    try {
      console.log(
        "💰 [PAYMENT] Starting payment success notifications for order:",
        orderId
      )

      // Get order details with partners
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  retailer: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      role: true,
                      businessName: true,
                    },
                  },
                },
              },
            },
          },
          serviceAppointments: {
            include: {
              service: {
                include: {
                  vendor: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      role: true,
                      businessName: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      if (!order) {
        console.error("❌ [PAYMENT] Order not found for payment notifications")
        return
      }

      // Collect unique partners
      const partners = new Map<string, any>()

      // Add product retailers
      order.orderItems.forEach((item) => {
        if (item.product?.retailer) {
          partners.set(item.product.retailer.id, item.product.retailer)
        }
      })

      // Add service vendors
      order.serviceAppointments.forEach((appointment) => {
        if (appointment.service?.vendor) {
          partners.set(
            appointment.service.vendor.id,
            appointment.service.vendor
          )
        }
      })

      console.log("💰 [PAYMENT] Found partners to notify:", partners.size)

      // Send notifications to each partner
      for (const [partnerId, partner] of partners) {
        try {
          const paymentData = {
            payment_id: paymentReference,
            order_id: orderId,
            amount: order.totalAmount.toString(),
            status: "successful",
            date: new Date().toLocaleDateString(),
          }

          let emailResult
          switch (partner.role) {
            case "vendor":
              emailResult = await this.emailService.sendPaymentSuccessfulEmail(
                partner.email,
                partner.fullName || partner.businessName || "Vendor",
                paymentData
              )
              break
            case "retailer":
              emailResult = await this.emailService.sendRetailerPaymentEmail(
                partner.email,
                partner.fullName || partner.businessName || "Retailer",
                paymentData
              )
              break
            case "manufacturer":
              emailResult =
                await this.emailService.sendManufacturerPaymentEmail(
                  partner.email,
                  partner.fullName || partner.businessName || "Manufacturer",
                  paymentData
                )
              break
            default:
              console.log(`⚠️ [PAYMENT] Unknown partner role: ${partner.role}`)
              continue
          }

          if (emailResult?.success) {
            console.log(
              `✅ [PAYMENT] ${partner.role} payment notification sent to ${partner.email} (ID: ${emailResult.messageId})`
            )
          } else {
            console.error(
              `❌ [PAYMENT] ${partner.role} payment notification failed to ${partner.email}:`,
              emailResult?.error
            )
          }
        } catch (error) {
          console.error(
            `❌ [PAYMENT] Error sending payment notification to ${partner.email}:`,
            error
          )
        }
      }

      console.log("💰 [PAYMENT] Payment success notifications completed")
    } catch (error) {
      console.error(
        "❌ [PAYMENT] Error in sendPaymentSuccessNotifications:",
        error
      )
      // Don't fail payment processing if notifications fail
    }
  }

  /**
   * Create escrow for service payments
   */
  private async createEscrowForServicePayments(
    order: any,
    paystackReference: string
  ) {
    try {
      console.log("🔒 [ESCROW] Creating escrow for service payments...")
      console.log("🔒 [ESCROW] Order ID:", order.id)
      console.log(
        "🔒 [ESCROW] Service Appointments:",
        order.serviceAppointments.length
      )

      // Create escrow for each service appointment
      for (const appointment of order.serviceAppointments) {
        if (appointment.service && appointment.service.vendor) {
          console.log(
            "🔒 [ESCROW] Creating escrow for service:",
            appointment.service.name
          )
          console.log("🔒 [ESCROW] Vendor ID:", appointment.service.vendor.id)
          console.log("🔒 [ESCROW] Service Price:", appointment.servicePrice)

          await this.escrowService.createEscrow({
            orderId: order.id,
            serviceId: appointment.service.id,
            vendorId: appointment.service.vendor.id,
            customerId: order.userId || undefined,
            amount: Number(appointment.servicePrice),
            currency: appointment.currency || "KES",
            paystackReference: paystackReference,
            createdBy: appointment.service.vendor.id, // Use vendor ID as creator
          })

          console.log(
            "✅ [ESCROW] Escrow created for service:",
            appointment.service.name
          )
        }
      }

      console.log("✅ [ESCROW] All service escrows created successfully")
    } catch (error) {
      console.error(
        "❌ [ESCROW] Failed to create escrow for service payments:",
        error
      )
      // Don't fail payment processing if escrow creation fails
    }
  }

  /**
   * Process commission transactions for order
   */
  private async processCommissionTransactions(order: any, reference: string) {
    try {
      console.log(
        "💰 [COMMISSION] Processing commission transactions for order:",
        order.id
      )

      // Process commission for product orders (retailers)
      for (const orderItem of order.orderItems) {
        if (orderItem.product?.retailer) {
          const retailer = orderItem.product.retailer
          const transactionAmount = Number(orderItem.totalPrice)

          console.log("💰 [COMMISSION] Processing retailer commission:", {
            retailerId: retailer.id,
            retailerRole: retailer.role,
            transactionAmount,
            productName: orderItem.product.name,
          })

          // Calculate commission using enhanced service
          const commissionData =
            await this.enhancedCommissionService.calculateCommission(
              transactionAmount,
              retailer.role as any,
              retailer.id
            )

          // Create commission transaction record
          const commissionTransaction = await this.prisma.commissionTransaction.create({
            data: {
              businessUserId: retailer.id,
              businessRole: retailer.role as any,
              transactionType: "product_sale",
              transactionId: order.id,
              transactionAmount: transactionAmount,
              commissionRate: commissionData.commissionRate,
              commissionAmount: commissionData.commissionAmount,
              paymentStatus: "pending",
              metadata: {
                orderId: order.id,
                orderItemId: orderItem.id,
                productId: orderItem.product.id,
                productName: orderItem.product.name,
                paystackReference: reference,
                processedAt: new Date().toISOString(),
              },
            },
          })

          console.log(
            "✅ [COMMISSION] Retailer commission transaction created:",
            {
              retailerId: retailer.id,
              commissionAmount: commissionData.commissionAmount,
              commissionRate: commissionData.commissionRate,
            }
          )

          // Queue commission for processing
          await this.commissionQueueService.addCommissionForProcessing({
            orderId: order.id,
            commissionTransactionId: commissionTransaction.id,
            paystackReference: reference,
          })
        }
      }

      // Process commission for service orders (vendors)
      for (const appointment of order.serviceAppointments) {
        if (appointment.service?.vendor) {
          const vendor = appointment.service.vendor
          const transactionAmount = Number(appointment.servicePrice)

          console.log("💰 [COMMISSION] Processing vendor commission:", {
            vendorId: vendor.id,
            vendorRole: vendor.role,
            transactionAmount,
            serviceName: appointment.service.name,
          })

          // Calculate commission using enhanced service
          const commissionData =
            await this.enhancedCommissionService.calculateCommission(
              transactionAmount,
              vendor.role as any,
              vendor.id
            )

          // Create commission transaction record
          const commissionTransaction = await this.prisma.commissionTransaction.create({
            data: {
              businessUserId: vendor.id,
              businessRole: vendor.role as any,
              transactionType: "service_booking",
              transactionId: order.id,
              transactionAmount: transactionAmount,
              commissionRate: commissionData.commissionRate,
              commissionAmount: commissionData.commissionAmount,
              paymentStatus: "pending",
              metadata: {
                orderId: order.id,
                appointmentId: appointment.id,
                serviceId: appointment.service.id,
                serviceName: appointment.service.name,
                paystackReference: reference,
                processedAt: new Date().toISOString(),
              },
            },
          })

          console.log(
            "✅ [COMMISSION] Vendor commission transaction created:",
            {
              vendorId: vendor.id,
              commissionAmount: commissionData.commissionAmount,
              commissionRate: commissionData.commissionRate,
            }
          )

          // Queue commission for processing
          await this.commissionQueueService.addCommissionForProcessing({
            orderId: order.id,
            commissionTransactionId: commissionTransaction.id,
            paystackReference: reference,
          })
        }
      }

      console.log(
        "✅ [COMMISSION] All commission transactions processed successfully"
      )
    } catch (error) {
      console.error(
        "❌ [COMMISSION] Failed to process commission transactions:",
        error
      )
      // Don't fail payment processing if commission processing fails
    }
  }

  /**
   * Create Pick Up Mtaani shipping packages for RETAILER product orders
   * This is ONLY for retailers selling physical products that need shipping
   * Vendors use escrow system instead
   */
  private async createPickUpMtaaniPackages(order: any): Promise<{ success: boolean; failedPackages: any[]; totalPackages: number }> {
    // Initialize tracking variables
    this.failedPackages = []
    let packages: any[] = []
    
    try {
      
      console.log(
        "📦 [PICKUP_MTAANI] ==========================================="
      )
      console.log("📦 [PICKUP_MTAANI] CREATING SHIPPING PACKAGES FOR RETAILERS")
      console.log("📦 [PICKUP_MTAANI] ===========================================")
      console.log(`📦 [PICKUP_MTAANI] Order ID: ${order.id}`)
      console.log(`📦 [PICKUP_MTAANI] Order Status: ${order.status}`)
      console.log(`📦 [PICKUP_MTAANI] Customer Email: ${order.customerEmail}`)
      console.log(`📦 [PICKUP_MTAANI] Total Amount: ${order.totalAmount}`)
      console.log(`📦 [PICKUP_MTAANI] Order Items Count: ${order.orderItems?.length || 0}`)
      console.log("📦 [PICKUP_MTAANI] ===========================================")

      // ONLY process product items (retailer orders)
      if (!order.orderItems || order.orderItems.length === 0) {
        console.log(
          "📦 [PICKUP_MTAANI] No product items to ship, skipping package creation"
        )
        console.log("📦 [PICKUP_MTAANI] (This is likely a services-only order)")
        return {
          success: true,
          failedPackages: [],
          totalPackages: 0
        }
      }

      console.log(
        `📦 [PICKUP_MTAANI] Found ${order.orderItems.length} product item(s) to ship`
      )

      // Group products by retailer
      const retailerGroups = new Map()

      console.log("📦 [PICKUP_MTAANI] ===========================================")
      console.log("📦 [PICKUP_MTAANI] GROUPING ITEMS BY RETAILER")
      console.log("📦 [PICKUP_MTAANI] ===========================================")

      for (const item of order.orderItems) {
        const retailerId = item.product.retailerId
        console.log(`📦 [PICKUP_MTAANI] Processing item: ${item.title}`)
        console.log(`📦 [PICKUP_MTAANI]   - Product ID: ${item.productId}`)
        console.log(`📦 [PICKUP_MTAANI]   - Retailer ID: ${retailerId}`)
        console.log(`📦 [PICKUP_MTAANI]   - Retailer Name: ${item.product.retailer?.businessName || item.product.retailer?.fullName || 'Unknown'}`)
        console.log(`📦 [PICKUP_MTAANI]   - Item Price: ${item.totalPrice}`)

        if (!retailerGroups.has(retailerId)) {
          console.log(`📦 [PICKUP_MTAANI]   - Creating new retailer group for ${retailerId}`)
          retailerGroups.set(retailerId, {
            retailer: item.product.retailer,
            items: [],
            totalValue: 0,
          })
        }

        const group = retailerGroups.get(retailerId)
        group.items.push(item)
        group.totalValue += Number(item.totalPrice)
        console.log(`📦 [PICKUP_MTAANI]   - Added to group. New total: ${group.totalValue}`)
      }

      console.log("📦 [PICKUP_MTAANI] ===========================================")
      console.log(`📦 [PICKUP_MTAANI] Grouped items into ${retailerGroups.size} retailer(s)`)
      
      // Debug: Log each retailer group
      retailerGroups.forEach((group, retailerId) => {
        console.log(`📦 [PICKUP_MTAANI] Retailer Group ${retailerId}:`)
        console.log(`📦 [PICKUP_MTAANI]   - Name: ${group.retailer.businessName || group.retailer.fullName}`)
        console.log(`📦 [PICKUP_MTAANI]   - Items: ${group.items.length}`)
        console.log(`📦 [PICKUP_MTAANI]   - Total Value: ${group.totalValue}`)
        console.log(`📦 [PICKUP_MTAANI]   - Has PickupMtaani Details: ${!!group.retailer.pickupMtaaniBusinessDetails}`)
      })
      console.log("📦 [PICKUP_MTAANI] ===========================================")

      // Get client shipping details
      if (!order.userId) {
        console.error(
          "❌ [PICKUP_MTAANI] Order has no userId - cannot get client shipping details"
        )
        return {
          success: false,
          failedPackages: [],
          totalPackages: 0
        }
      }

      const client = await this.prisma.profile.findUnique({
        where: { id: order.userId },
        select: {
          id: true,
          fullName: true,
          phone: true,
          deliveryDetails: true,
        },
      })

      if (!client?.deliveryDetails) {
        console.error("❌ [PICKUP_MTAANI] Client missing delivery details")
        console.error(
          "❌ [PICKUP_MTAANI] Client must configure shipping in their profile"
        )
        return {
          success: false,
          failedPackages: [],
          totalPackages: 0
        }
      }

      const clientDeliveryDetails = client.deliveryDetails as any
      const receiverAgentId = Number(clientDeliveryDetails.agentId)

      if (!receiverAgentId) {
        console.error("❌ [PICKUP_MTAANI] Client missing receiver agent ID")
        return {
          success: false,
          failedPackages: [],
          totalPackages: 0
        }
      }

      console.log(`📦 [PICKUP_MTAANI] Client: ${client.fullName || "Unknown"}`)
      console.log(`📦 [PICKUP_MTAANI] Receiver Agent ID: ${receiverAgentId}`)
      console.log(
        `📦 [PICKUP_MTAANI] Receiver Location: ${clientDeliveryDetails.locationName || "Unknown"}`
      )
      console.log(
        `📦 [PICKUP_MTAANI] Receiver Agent: ${clientDeliveryDetails.agentName || "Unknown"}`
      )

      // Create package for each retailer
      let packageNumber = 1

      for (const [retailerId, group] of retailerGroups) {
        try {
          console.log(
            "📦 [PICKUP_MTAANI] -------------------------------------------"
          )
          console.log(
            `📦 [PICKUP_MTAANI] Processing package ${packageNumber}/${retailerGroups.size}`
          )
          console.log(
            `📦 [PICKUP_MTAANI] Retailer: ${group.retailer.businessName || group.retailer.fullName}`
          )
          console.log(`📦 [PICKUP_MTAANI] Items: ${group.items.length}`)
          console.log(`📦 [PICKUP_MTAANI] Total Value: KES ${group.totalValue}`)

          // Check if retailer has shipping details configured
          const retailerDeliveryDetails = group.retailer.deliveryDetails as any

          // The agentId is nested inside deliveryDetails.deliveryDetails
          const senderAgentId = retailerDeliveryDetails?.deliveryDetails?.agentId || retailerDeliveryDetails?.agentId

          if (!senderAgentId) {
            console.warn(
              `⚠️ [PICKUP_MTAANI] Retailer ${retailerId} missing sender agent - SKIPPING`
            )
            console.warn(
              `⚠️ [PICKUP_MTAANI] Retailer must configure shipping in their profile`
            )
            // TODO: Notify retailer to configure shipping
            packageNumber++
            continue
          }

          const senderAgentIdNumber = Number(senderAgentId)
          console.log(`📦 [PICKUP_MTAANI] Sender Agent ID: ${senderAgentIdNumber}`)
          console.log(
            `📦 [PICKUP_MTAANI] Sender Location: ${retailerDeliveryDetails.locationName || "Unknown"}`
          )
          console.log(
            `📦 [PICKUP_MTAANI] Sender Agent: ${retailerDeliveryDetails.agentName || "Unknown"}`
          )

          // Debug: Log retailer data for troubleshooting
          console.log(`🔍 [PICKUP_MTAANI] Retailer ${retailerId} data:`, {
            id: group.retailer.id,
            businessName: group.retailer.businessName,
            fullName: group.retailer.fullName,
            hasPickupMtaaniBusinessDetails: !!group.retailer.pickupMtaaniBusinessDetails,
            pickupMtaaniBusinessDetails: group.retailer.pickupMtaaniBusinessDetails
          })

          // Validate retailer's Pickup Mtaani business ID
          const businessIdValidation = this.pickupMtaaniService.validateRetailerBusinessId(group.retailer)
          
          if (!businessIdValidation.valid) {
            console.error(`❌ [PICKUP_MTAANI] Retailer ${retailerId} missing Pickup Mtaani business ID`)
            console.error(`❌ [PICKUP_MTAANI] Error: ${businessIdValidation.error}`)
            console.error(`❌ [PICKUP_MTAANI] Retailer must complete Pickup Mtaani business setup`)
            // Add to failed packages list
            this.failedPackages.push({
              retailerId,
              retailerName: group.retailer.businessName || group.retailer.fullName,
              retailerEmail: group.retailer.email,
              error: businessIdValidation.error,
              items: group.items
            })
            packageNumber++
            continue
          }

          console.log(`📦 [PICKUP_MTAANI] Business ID: ${businessIdValidation.businessId}`)

          // Prepare package name with item details
          const itemNames = group.items.map((item) => item.title).join(", ")
          const packageName =
            group.items.length === 1
              ? `Order ${order.id.slice(0, 8)} - ${itemNames.slice(0, 30)}`
              : `Order ${order.id.slice(0, 8)} - ${group.items.length} items`

          // Prepare package data
          const packageData = {
            receiverAgentId: receiverAgentId,
            senderAgentId: senderAgentIdNumber,
            packageValue: Math.round(group.totalValue), // Round to whole number
            customerName: client.fullName || order.customerEmail.split("@")[0],
            packageName: packageName,
            customerPhoneNumber:
              order.customerPhone || client.phone || "0700000000",
            paymentOption: "vendor" as const, // Payment already completed via Paystack
            on_delivery_balance: 0, // No payment on delivery
          }

          console.log("📦 [PICKUP_MTAANI] Calling Pick Up Mtaani API...")

          // Call Pick Up Mtaani API
          const packageResponse =
            await this.pickupMtaaniService.createPackage(packageData, businessIdValidation.businessId)

          console.log("✅ [PICKUP_MTAANI] Package created successfully!")
          console.log(
            `✅ [PICKUP_MTAANI] Receipt No: ${packageResponse.data.receipt_no}`
          )
          console.log(
            `✅ [PICKUP_MTAANI] Package ID: ${packageResponse.data.id}`
          )
          console.log(
            `✅ [PICKUP_MTAANI] Delivery Fee: KES ${packageResponse.data.delivery_fee}`
          )

          packages.push({
            retailerId: retailerId,
            retailerName:
              group.retailer.businessName || group.retailer.fullName,
            packageId: packageResponse.data.id,
            receiptNo: packageResponse.data.receipt_no,
            deliveryFee: packageResponse.data.delivery_fee,
            senderAgentId: senderAgentIdNumber,
            receiverAgentId: receiverAgentId,
            packageValue: group.totalValue,
            packageName: packageName,
            status: packageResponse.data.state,
            paymentStatus: packageResponse.data.payment_status,
            trackingLink: this.normalizeTrackingLink(packageResponse.data.trackingLink),
            createdAt: packageResponse.data.createdAt,
            items: group.items.map((item) => ({
              productId: item.productId,
              productName: item.title,
              quantity: item.quantity,
              price: Number(item.totalPrice),
            })),
          })

          // Add package tracking job
          try {
            await this.packageTrackingQueueService.addPackageTrackingJob({
              orderId: order.id,
              packageId: packageResponse.data.id,
              businessId: businessIdValidation.businessId,
              retailerId: retailerId,
              retailerName: group.retailer.businessName || group.retailer.fullName,
              customerEmail: order.customerEmail,
              customerName: client?.fullName || 'Customer',
            }, 30 * 1000) // Start tracking after 30 seconds for demo

            console.log(`📦 [PACKAGE_TRACKING] Added tracking job for package ${packageResponse.data.id}`)
          } catch (error) {
            console.error(`❌ [PACKAGE_TRACKING] Failed to add tracking job for package ${packageResponse.data.id}:`, error)
            // Don't fail package creation if tracking job fails
          }

          packageNumber++
        } catch (error) {
          console.error(
            "📦 [PICKUP_MTAANI] -------------------------------------------"
          )
          console.error(
            `❌ [PICKUP_MTAANI] Failed to create package for retailer ${retailerId}`
          )

          if (error.response) {
            console.error(
              `❌ [PICKUP_MTAANI] API Error Status: ${error.response.status}`
            )
            console.error(
              `❌ [PICKUP_MTAANI] API Error Data:`,
              error.response.data
            )
          } else {
            console.error(`❌ [PICKUP_MTAANI] Error:`, error.message)
          }

          console.error(
            "❌ [PICKUP_MTAANI] Package creation failed - continuing with other retailers"
          )
          packageNumber++
          // Don't fail the entire process - log and continue
        }
      }

      // Store package references in order
      if (packages.length > 0) {
        console.log(
          "📦 [PICKUP_MTAANI] ==========================================="
        )
        console.log(
          `📦 [PICKUP_MTAANI] Storing ${packages.length} package reference(s)`
        )
        await this.storePackageReferences(order.id, packages)
        console.log("✅ [PICKUP_MTAANI] Package references stored successfully")

        // Log summary
        console.log(
          "📦 [PICKUP_MTAANI] ==========================================="
        )
        console.log("📦 [PICKUP_MTAANI] PACKAGE CREATION SUMMARY")
        console.log(
          "📦 [PICKUP_MTAANI] ==========================================="
        )
        console.log(`📦 [PICKUP_MTAANI] Order ID: ${order.id}`)
        console.log(
          `📦 [PICKUP_MTAANI] Total Packages Created: ${packages.length}`
        )
        console.log(
          `📦 [PICKUP_MTAANI] Total Retailers: ${retailerGroups.size}`
        )

        packages.forEach((pkg, index) => {
          console.log(`📦 [PICKUP_MTAANI] Package ${index + 1}:`)
          console.log(`📦 [PICKUP_MTAANI]   - Receipt: ${pkg.receiptNo}`)
          console.log(`📦 [PICKUP_MTAANI]   - Retailer: ${pkg.retailerName}`)
          console.log(`📦 [PICKUP_MTAANI]   - Value: KES ${pkg.packageValue}`)
          console.log(
            `📦 [PICKUP_MTAANI]   - Delivery Fee: KES ${pkg.deliveryFee}`
          )
        })
      } else {
        console.warn("⚠️ [PICKUP_MTAANI] No packages were created")
        if (retailerGroups.size > 0) {
          console.warn(
            "⚠️ [PICKUP_MTAANI] All retailers may be missing shipping configuration"
          )
        }
      }

      // Handle failed packages
      if (this.failedPackages.length > 0) {
        console.log(
          "📦 [PICKUP_MTAANI] ==========================================="
        )
        console.log(`📦 [PICKUP_MTAANI] ${this.failedPackages.length} PACKAGE(S) FAILED`)
        console.log(
          "📦 [PICKUP_MTAANI] ==========================================="
        )
        
        // Log failed packages details
        this.failedPackages.forEach((failedPkg, index) => {
          console.log(`📦 [PICKUP_MTAANI] Failed Package ${index + 1}:`)
          console.log(`📦 [PICKUP_MTAANI]   - Retailer: ${failedPkg.retailerName}`)
          console.log(`📦 [PICKUP_MTAANI]   - Error: ${failedPkg.error}`)
          console.log(`📦 [PICKUP_MTAANI]   - Items: ${failedPkg.items.length}`)
        })

        // Send email notifications for failed packages
        await this.sendFailedPackageNotifications(order, this.failedPackages)
      }

      console.log(
        "📦 [PICKUP_MTAANI] ==========================================="
      )
      console.log("📦 [PICKUP_MTAANI] PACKAGE CREATION SUMMARY")
      console.log(
        "📦 [PICKUP_MTAANI] ==========================================="
      )
      console.log(`📦 [PICKUP_MTAANI] Total Retailers Processed: ${retailerGroups.size}`)
      console.log(`📦 [PICKUP_MTAANI] Packages Created Successfully: ${packages.length}`)
      console.log(`📦 [PICKUP_MTAANI] Packages Failed: ${this.failedPackages.length}`)
      console.log(`📦 [PICKUP_MTAANI] Total Packages: ${this.failedPackages.length + packages.length}`)
      console.log(`📦 [PICKUP_MTAANI] Success Rate: ${packages.length}/${retailerGroups.size} (${retailerGroups.size > 0 ? Math.round((packages.length / retailerGroups.size) * 100) : 0}%)`)
      console.log(
        "📦 [PICKUP_MTAANI] ==========================================="
      )

      // Return results
      const totalPackages = this.failedPackages.length + packages.length
      return {
        success: this.failedPackages.length === 0,
        failedPackages: this.failedPackages,
        totalPackages
      }
    } catch (error) {
      console.error(
        "📦 [PICKUP_MTAANI] ==========================================="
      )
      console.error("❌ [PICKUP_MTAANI] PACKAGE CREATION PROCESS FAILED")
      console.error(
        "📦 [PICKUP_MTAANI] ==========================================="
      )
      console.error("❌ [PICKUP_MTAANI] Error:", error.message)
      console.error("❌ [PICKUP_MTAANI] Stack:", error.stack)
      console.error(
        "📦 [PICKUP_MTAANI] ==========================================="
      )
      // Don't fail payment processing if package creation fails
      // The order is still valid, packages can be created manually
      return {
        success: false,
        failedPackages: this.failedPackages,
        totalPackages: this.failedPackages.length
      }
    }
  }

  /**
   * Update order status when retailer pays for shipping
   * This should be called when package payment_status changes to 'paid'
   */
  async updateOrderStatusOnShippingPayment(orderId: string, packageId: number) {
    try {
      console.log(`📦 [SHIPPING_PAYMENT] Updating order status for shipping payment: Order ${orderId}, Package ${packageId}`)
      
      // Get the order
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true, shippingAddress: true }
      })

      if (!order) {
        console.error(`❌ [SHIPPING_PAYMENT] Order ${orderId} not found`)
        return
      }

      // Update order status to confirmed (ready for shipping)
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'confirmed' }
      })

      console.log(`✅ [SHIPPING_PAYMENT] Order ${orderId} status updated to confirmed`)
    } catch (error) {
      console.error(`❌ [SHIPPING_PAYMENT] Error updating order status:`, error)
    }
  }

  /**
   * Update order status based on package creation results
   */
  private async updateOrderStatusBasedOnPackages(order: any, packageResults: { success: boolean; failedPackages: any[]; totalPackages: number }) {
    try {
      let newStatus = 'processing' // Default status after package creation
      
      if (packageResults.totalPackages === 0) {
        // No packages to create (services-only order) - keep as paid
        newStatus = 'paid'
      } else if (packageResults.success) {
        // All packages created successfully - now processing (waiting for retailer to pay shipping)
        newStatus = 'processing'
      } else if (packageResults.failedPackages.length === packageResults.totalPackages) {
        // All packages failed
        newStatus = 'pending_confirmation'
      } else {
        // Some packages failed, some succeeded
        newStatus = 'partially_shipped'
      }

      // Update order status
      await this.prisma.order.update({
        where: { id: order.id },
        data: { 
          status: newStatus as any,
        }
      })

      // Log package creation results for debugging
      console.log(`📦 [ORDER_STATUS] Package creation results for order ${order.id}:`, {
        success: packageResults.success,
        totalPackages: packageResults.totalPackages,
        failedPackages: packageResults.failedPackages.length,
        failedRetailers: packageResults.failedPackages.map(pkg => ({
          retailerId: pkg.retailerId,
          retailerName: pkg.retailerName,
          error: pkg.error
        }))
      })

      console.log(`📦 [ORDER_STATUS] Order ${order.id} status updated to: ${newStatus}`)
      console.log(`📦 [ORDER_STATUS] Package results: ${packageResults.failedPackages.length}/${packageResults.totalPackages} failed`)
    } catch (error) {
      console.error('❌ [ORDER_STATUS] Error updating order status based on packages:', error)
    }
  }

  /**
   * Send email notifications for failed package creation
   */
  private async sendFailedPackageNotifications(order: any, failedPackages: any[]) {
    try {
      console.log("📧 [EMAIL] Sending failed package notifications...")
      
      // Get client details
      const client = await this.prisma.profile.findUnique({
        where: { id: order.userId },
        select: { fullName: true, email: true }
      })

      if (!client) {
        console.error("❌ [EMAIL] Client not found for failed package notifications")
        return
      }

      // Send notifications to retailers with failed packages
      for (const failedPkg of failedPackages) {
        try {
          await this.emailService.sendRetailerPackageCreationFailedEmail(
            failedPkg.retailerEmail,
            failedPkg.retailerName,
            order.id,
            failedPkg.error
          )
          console.log(`✅ [EMAIL] Retailer notification sent to: ${failedPkg.retailerEmail}`)
        } catch (error) {
          console.error(`❌ [EMAIL] Failed to send retailer notification to ${failedPkg.retailerEmail}:`, error)
        }
      }

      // Send notification to client if any packages failed
      if (failedPackages.length > 0) {
        try {
          await this.emailService.sendClientPartialOrderShippingEmail(
            client.email,
            client.fullName || 'Customer',
            order.id,
            failedPackages
          )
          console.log(`✅ [EMAIL] Client notification sent to: ${client.email}`)
        } catch (error) {
          console.error(`❌ [EMAIL] Failed to send client notification to ${client.email}:`, error)
        }
      }

      console.log("✅ [EMAIL] Failed package notifications completed")
    } catch (error) {
      console.error("❌ [EMAIL] Error sending failed package notifications:", error)
    }
  }

  /**
   * Store package references in order's shippingAddress field and immediately fetch status
   */
  private async storePackageReferences(orderId: string, packages: any[]) {
    try {
      // Get current order
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { shippingAddress: true, retailerId: true },
      })

      const shippingAddress = (order?.shippingAddress as any) || {}

      // Store packages in shippingAddress JSON field
      shippingAddress.pickupMtaaniPackages = packages

      // Immediately fetch and update package status for the first package
      if (packages.length > 0) {
        const firstPackage = packages[0]
        console.log(`🔄 [PACKAGE_STATUS] Immediately fetching status for package ${firstPackage.packageId}`)
        
        try {
          // Get retailer profile to get business ID
          const retailerProfile = await this.prisma.profile.findUnique({
            where: { id: firstPackage.retailerId },
            select: { pickupMtaaniBusinessDetails: true }
          })

          const businessDetails = retailerProfile?.pickupMtaaniBusinessDetails as any
          if (businessDetails?.businessId) {
            const businessId = businessDetails.businessId.toString()
            
            // Fetch fresh package data from Pick Up Mtaani
            const freshPackageResponse = await this.pickupMtaaniService.getPackageStatus(
              firstPackage.packageId, 
              businessId
            )
            const freshPackageData = freshPackageResponse?.data

            if (freshPackageData) {
              console.log(`✅ [PACKAGE_STATUS] Fresh package data fetched:`, {
                status: freshPackageData.state,
                paymentStatus: freshPackageData.payment_status,
                trackingLink: freshPackageData.trackingLink
              })

              // Update the package in shippingAddress with fresh data
              firstPackage.status = freshPackageData.state
              firstPackage.paymentStatus = freshPackageData.payment_status
              firstPackage.trackingLink = freshPackageData.trackingLink
              firstPackage.updatedAt = freshPackageData.createdAt

              // Update the order with fresh package tracking data
              await this.prisma.order.update({
                where: { id: orderId },
                data: {
                  packageStatus: freshPackageData.state,
                  packageTrackingId: freshPackageData.trackId,
                  packageReceiptNo: freshPackageData.receipt_no,
                  packageTrackingLink: freshPackageData.trackingLink,
                  packageTrackingHistory: freshPackageData.agent_package_tracks?.descriptions || [],
                  shippingAddress: {
                    ...shippingAddress,
                    pickupMtaaniPackages: packages,
                  },
                }
              })

              console.log(`✅ [PACKAGE_STATUS] Order updated with fresh package data`)
            } else {
              console.warn(`⚠️ [PACKAGE_STATUS] Could not fetch fresh data for package ${firstPackage.packageId}`)
            }
          } else {
            console.warn(`⚠️ [PACKAGE_STATUS] Retailer business ID not found for immediate status fetch`)
          }
        } catch (statusError) {
          console.error(`❌ [PACKAGE_STATUS] Failed to fetch immediate status:`, statusError)
          // Don't fail package creation if status fetch fails
        }
      }

      await this.prisma.order.update({
        where: { id: orderId },
        data: { shippingAddress },
      })

      console.log(
        "✅ [PICKUP_MTAANI] Package references stored in order.shippingAddress"
      )
    } catch (error) {
      console.error(
        "❌ [PICKUP_MTAANI] Failed to store package references:",
        error
      )
      throw error
    }
  }
}
