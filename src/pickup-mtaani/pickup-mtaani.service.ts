import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import axios from "axios"

export interface CreatePackageDto {
  receieverAgentID_id: number
  senderAgentID_id: number
  packageValue: number
  customerName: string
  packageName: string
  customerPhoneNumber: string
  paymentOption: "vendor" | "customer"
  on_delivery_balance: number
}

export interface PackageResponse {
  message: string
  data: {
    id: number
    createdAt: string
    customerName: string
    customerPhoneNumber: string
    packageName: string
    state: string
    receipt_no: string
    receieverAgentID_id: number
    senderAgentID_id: number
    businessId_id: number
    delivery_fee: number
    type: string
  }
}

/**
 * Service for integrating with Pick Up Mtaani delivery API
 * Used ONLY for RETAILER product orders (physical shipping)
 * Vendors use escrow system instead
 */
@Injectable()
export class PickupMtaaniService {
  private readonly logger = new Logger(PickupMtaaniService.name)
  private readonly apiKey: string
  private readonly businessId: string
  private readonly baseUrl: string

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("PICKUP_MTAANI_API_KEY")
    this.businessId = this.configService.get<string>(
      "PICKUP_MTAANI_BUSINESS_ID"
    )
    this.baseUrl =
      this.configService.get<string>("PICKUP_MTAANI_BASE_URL") ||
      "https://staging7.dev.pickupmtaani.com/api/v1"

    if (!this.apiKey || !this.businessId) {
      this.logger.error("❌ Pick Up Mtaani credentials not configured")
      this.logger.error(
        "Please set PICKUP_MTAANI_API_KEY and PICKUP_MTAANI_BUSINESS_ID in .env"
      )
    } else {
      this.logger.log("✅ Pick Up Mtaani service initialized")
    }
  }

  /**
   * Create a shipping package for retailer product orders
   * @param packageData Package creation details
   * @returns Package response with tracking info
   */
  async createPackage(packageData: CreatePackageDto): Promise<PackageResponse> {
    try {
      this.logger.log(
        "📦 [CREATE_PACKAGE] =========================================="
      )
      this.logger.log("📦 [CREATE_PACKAGE] Creating Pick Up Mtaani package...")
      this.logger.log(
        "📦 [CREATE_PACKAGE] =========================================="
      )
      this.logger.log(
        `📦 [CREATE_PACKAGE] Package Name: ${packageData.packageName}`
      )
      this.logger.log(
        `📦 [CREATE_PACKAGE] Package Value: KES ${packageData.packageValue}`
      )
      this.logger.log(
        `📦 [CREATE_PACKAGE] Customer: ${packageData.customerName}`
      )
      this.logger.log(
        `📦 [CREATE_PACKAGE] Phone: ${packageData.customerPhoneNumber}`
      )
      this.logger.log(
        `📦 [CREATE_PACKAGE] Sender Agent ID: ${packageData.senderAgentID_id}`
      )
      this.logger.log(
        `📦 [CREATE_PACKAGE] Receiver Agent ID: ${packageData.receieverAgentID_id}`
      )
      this.logger.log(
        `📦 [CREATE_PACKAGE] Payment Option: ${packageData.paymentOption}`
      )

      const url = `${this.baseUrl}/packages/agent-agent?b_id=${this.businessId}`

      this.logger.log(`📦 [CREATE_PACKAGE] API URL: ${url}`)

      const response = await axios.post<PackageResponse>(url, packageData, {
        headers: {
          accept: "application/json",
          apiKey: this.apiKey,
          "Content-Type": "application/json",
        },
        timeout: 15000, // 15 second timeout
      })

      this.logger.log(
        "📦 [CREATE_PACKAGE] =========================================="
      )
      this.logger.log("📦 [CREATE_PACKAGE] PACKAGE CREATED SUCCESSFULLY")
      this.logger.log(
        "📦 [CREATE_PACKAGE] =========================================="
      )
      this.logger.log(
        `📦 [CREATE_PACKAGE] Package ID: ${response.data.data.id}`
      )
      this.logger.log(
        `📦 [CREATE_PACKAGE] Receipt No: ${response.data.data.receipt_no}`
      )
      this.logger.log(
        `📦 [CREATE_PACKAGE] Delivery Fee: KES ${response.data.data.delivery_fee}`
      )
      this.logger.log(`📦 [CREATE_PACKAGE] Status: ${response.data.data.state}`)
      this.logger.log(
        `📦 [CREATE_PACKAGE] Created At: ${response.data.data.createdAt}`
      )
      this.logger.log(
        "📦 [CREATE_PACKAGE] =========================================="
      )

      return response.data
    } catch (error) {
      this.logger.error(
        "📦 [CREATE_PACKAGE] =========================================="
      )
      this.logger.error("📦 [CREATE_PACKAGE] PACKAGE CREATION FAILED")
      this.logger.error(
        "📦 [CREATE_PACKAGE] =========================================="
      )

      if (error.response) {
        this.logger.error(
          `📦 [CREATE_PACKAGE] Status: ${error.response.status}`
        )
        this.logger.error(
          `📦 [CREATE_PACKAGE] Data: ${JSON.stringify(error.response.data, null, 2)}`
        )
      } else if (error.request) {
        this.logger.error(
          "📦 [CREATE_PACKAGE] No response received from Pick Up Mtaani API"
        )
        this.logger.error(
          "📦 [CREATE_PACKAGE] Check network connectivity and API URL"
        )
      } else {
        this.logger.error(`📦 [CREATE_PACKAGE] Error: ${error.message}`)
      }

      this.logger.error(
        "📦 [CREATE_PACKAGE] =========================================="
      )
      throw error
    }
  }

  /**
   * Get package status (for future implementation)
   * @param packageId Pick Up Mtaani package ID
   * @returns Package status details
   */
  async getPackageStatus(packageId: number): Promise<any> {
    try {
      this.logger.log(`📦 Fetching status for package ${packageId}`)

      const response = await axios.get(
        `${this.baseUrl}/packages/${packageId}?b_id=${this.businessId}`,
        {
          headers: {
            accept: "application/json",
            apiKey: this.apiKey,
          },
          timeout: 10000,
        }
      )

      this.logger.log(
        `✅ Package status retrieved: ${response.data.data?.state}`
      )
      return response.data
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch package status for ${packageId}:`,
        error.response?.data || error.message
      )
      throw error
    }
  }

  /**
   * Test API connectivity
   * @returns true if API is accessible
   */
  async testConnection(): Promise<boolean> {
    try {
      this.logger.log("🔍 Testing Pick Up Mtaani API connection...")

      // Try to fetch delivery areas as a connectivity test
      const response = await axios.get(`${this.baseUrl}/locations/areas`, {
        headers: {
          accept: "application/json",
          apiKey: this.apiKey,
        },
        timeout: 5000,
      })

      this.logger.log("✅ Pick Up Mtaani API connection successful")
      return true
    } catch (error) {
      this.logger.error(
        "❌ Pick Up Mtaani API connection failed:",
        error.response?.data || error.message
      )
      return false
    }
  }

  /**
   * Get all packages for the business from Pick Up Mtaani
   * @returns Array of packages with current status
   */
  async getAllBusinessPackages(): Promise<any[]> {
    try {
      this.logger.log(
        "📦 [GET_PACKAGES] Fetching all packages from Pick Up Mtaani..."
      )

      const response = await axios.get(
        `${this.baseUrl}/packages/my-unpaid-packages?b_id=${this.businessId}`,
        {
          headers: {
            accept: "application/json",
            apiKey: this.apiKey,
          },
          timeout: 10000,
        }
      )

      const packages = response.data.data || []
      this.logger.log(`📦 [GET_PACKAGES] Found ${packages.length} packages`)

      return packages
    } catch (error) {
      this.logger.error(
        "❌ [GET_PACKAGES] Failed to fetch packages:",
        error.response?.data || error.message
      )
      return []
    }
  }

  /**
   * Get specific package by ID or receipt number
   * @param identifier Package ID or receipt number
   * @returns Package details with current status
   */
  async getPackageByIdentifier(identifier: string | number): Promise<any> {
    try {
      // First try to get from all packages
      const allPackages = await this.getAllBusinessPackages()

      // Search by package ID or receipt number
      const packageData = allPackages.find(
        (pkg) =>
          pkg.id === identifier ||
          pkg.receipt_no === identifier ||
          pkg.id === Number(identifier)
      )

      if (packageData) {
        return packageData
      }

      // If not found in unpaid packages, try direct fetch
      return await this.getPackageStatus(Number(identifier))
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch package ${identifier}:`,
        error.response?.data || error.message
      )
      return null
    }
  }

  /**
   * ==========================================
   * WEBHOOK MANAGEMENT
   * ==========================================
   */

  /**
   * Register webhook URL with Pick Up Mtaani
   * @param webhookUrl Your server's webhook endpoint URL
   * @returns Registration result
   */
  async registerWebhook(webhookUrl: string): Promise<any> {
    this.logger.log(`📡 [WEBHOOK] Registering webhook: ${webhookUrl}`)

    try {
      const response = await axios.post(
        `${this.baseUrl}/webhooks/register`,
        {
          webhook_url: webhookUrl,
        },
        {
          headers: {
            accept: "application/json",
            apiKey: this.apiKey,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      )

      this.logger.log(
        `✅ [WEBHOOK] Webhook registered successfully: ${JSON.stringify(response.data)}`
      )

      return {
        success: true,
        data: response.data,
        webhook_url: webhookUrl,
      }
    } catch (error) {
      this.logger.error(
        "❌ [WEBHOOK] Failed to register webhook:",
        error.response?.data || error.message
      )
      return {
        success: false,
        error: error.response?.data || error.message,
        webhook_url: webhookUrl,
      }
    }
  }

  /**
   * Test webhook endpoint (if Pick Up Mtaani provides one)
   */
  async testWebhook(webhookUrl: string): Promise<any> {
    this.logger.log(`🧪 [WEBHOOK] Testing webhook: ${webhookUrl}`)

    try {
      // If Pick Up Mtaani provides a test endpoint
      const response = await axios.post(
        `${this.baseUrl}/webhooks/test`,
        {
          webhook_url: webhookUrl,
        },
        {
          headers: {
            accept: "application/json",
            apiKey: this.apiKey,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      )

      this.logger.log(`✅ [WEBHOOK] Webhook test successful`)
      return { success: true, data: response.data }
    } catch (error) {
      this.logger.warn(
        `⚠️ [WEBHOOK] Webhook test endpoint not available or failed:`,
        error.response?.status || error.message
      )
      return {
        success: false,
        error: "Test endpoint not available",
      }
    }
  }

  /**
   * Get current webhook configuration (if Pick Up Mtaani provides this)
   */
  async getWebhookConfig(): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/webhooks?b_id=${this.businessId}`,
        {
          headers: {
            accept: "application/json",
            apiKey: this.apiKey,
          },
          timeout: 10000,
        }
      )

      return { success: true, data: response.data }
    } catch (error) {
      this.logger.debug(
        `ℹ️ [WEBHOOK] Get webhook config not available:`,
        error.response?.status || error.message
      )
      return {
        success: false,
        error: "Get webhook config endpoint not available",
      }
    }
  }
}
