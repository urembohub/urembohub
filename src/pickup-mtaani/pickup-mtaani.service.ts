import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import axios from "axios"
import { CreateBusinessDto } from "./dto/create-business.dto"

export interface CreatePackageDto {
  receiverAgentId?: number // Optional for door delivery
  senderAgentId: number
  packageValue: number
  customerName: string
  packageName: string
  customerPhoneNumber: string
  paymentOption: "vendor" | "customer"
  on_delivery_balance: number
  // Door delivery fields (optional) - matching API field names
  doorstepDestinationId?: number
  lat?: number
  lng?: number
  locationDescription?: string // API field name
  payment_number?: string // API field name (snake_case) - For customer payment option
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
    receieverAgentID_id: number  // Note: API has typo in field name
    senderAgentID_id: number     // Note: API has typo in field name
    businessId_id: number
    delivery_fee: number
    type: string
    payment_status?: string
    trackId?: string
    trackingLink?: string
    agent_package_tracks?: {
      descriptions: Array<{
        time: number
        state: string
        createdAt: string
        descriptions: string
      }>
    }
    door_step_package_tracks?: { // Doorstep packages use this field
      descriptions: Array<{
        time: number
        state: string
        descriptions: string
      }>
    }
    agent_id?: number // Doorstep packages use this instead of senderAgentID_id
    doorstep_destination_id?: number // Doorstep packages have this field
  }
}

export interface BusinessCategory {
  id: number
  name: string
}

export interface BusinessCategoryResponse {
  totalCount: number
  pageNumber: number
  pageSize: number
  data: BusinessCategory[]
}

// Moved to dto/create-business.dto.ts

export interface BusinessResponse {
  data: {
    id: number
    name: string
    phone_number: string
    createdAt: string
    business_categories: {
      id: number
      name: string
    }
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
  // Removed global businessId - now using retailer-specific business IDs
  private readonly baseUrl: string

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("PICKUP_MTAANI_API_KEY")
    this.baseUrl =
      this.configService.get<string>("PICKUP_MTAANI_BASE_URL") ||
      "https://staging7.dev.pickupmtaani.com/api/vv1"

    if (!this.apiKey) {
      this.logger.error("❌ Pick Up Mtaani API key not configured")
      this.logger.error("Please set PICKUP_MTAANI_API_KEY in .env")
    } else {
      this.logger.log("✅ Pick Up Mtaani service initialized")
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
   * Create a shipping package for retailer product orders
   * @param packageData Package creation details
   * @param businessId Pickup Mtaani business ID for the retailer
   * @returns Package response with tracking info
   */
  async createPackage(packageData: CreatePackageDto, businessId: string): Promise<PackageResponse> {
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
        `📦 [CREATE_PACKAGE] Sender Agent ID: ${packageData.senderAgentId}`
      )
      this.logger.log(
        `📦 [CREATE_PACKAGE] Receiver Agent ID: ${packageData.receiverAgentId}`
      )
      this.logger.log(
        `📦 [CREATE_PACKAGE] Payment Option: ${packageData.paymentOption}`
      )
      this.logger.log(
        `📦 [CREATE_PACKAGE] Business ID: ${businessId}`
      )

      // Determine delivery mode and endpoint
      const isDoorDelivery = !!packageData.doorstepDestinationId
      const endpoint = isDoorDelivery ? 'doorstep' : 'agent-agent'
      const url = `${this.baseUrl}/packages/${endpoint}?b_id=${businessId}`

      if (isDoorDelivery) {
        this.logger.log(
          `📦 [CREATE_PACKAGE] Delivery Mode: DOOR DELIVERY`
        )
        this.logger.log(
          `📦 [CREATE_PACKAGE] Doorstep Destination ID: ${packageData.doorstepDestinationId}`
        )
        this.logger.log(
          `📦 [CREATE_PACKAGE] Address: ${packageData.locationDescription}`
        )
        this.logger.log(
          `📦 [CREATE_PACKAGE] Coordinates: ${packageData.lat}, ${packageData.lng}`
        )
        if (packageData.payment_number) {
          this.logger.log(
            `📦 [CREATE_PACKAGE] Payment Number: ${packageData.payment_number}`
          )
        }
      } else {
        this.logger.log(
          `📦 [CREATE_PACKAGE] Delivery Mode: AGENT-AGENT`
        )
      }

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
   * Validate retailer's Pickup Mtaani business ID
   * @param retailerProfile Retailer profile data
   * @returns Validation result with business ID or error message
   */
  validateRetailerBusinessId(retailerProfile: any): { valid: boolean; businessId?: string; error?: string } {
    try {
      this.logger.log(`🔍 [BUSINESS_VALIDATION] Validating business ID for retailer: ${retailerProfile.id}`)
      this.logger.log(`🔍 [BUSINESS_VALIDATION] Retailer profile:`, JSON.stringify(retailerProfile, null, 2))
      
      // Check if pickupMtaaniBusinessDetails exists
      if (!retailerProfile.pickupMtaaniBusinessDetails) {
        this.logger.warn(`⚠️ [BUSINESS_VALIDATION] No pickupMtaaniBusinessDetails found for retailer: ${retailerProfile.id}`)
        return {
          valid: false,
          error: 'Retailer has not completed Pickup Mtaani business setup'
        }
      }

      const businessDetails = retailerProfile.pickupMtaaniBusinessDetails
      this.logger.log(`🔍 [BUSINESS_VALIDATION] Business details:`, JSON.stringify(businessDetails, null, 2))
      
      // Check for businessId or id field
      const businessId = businessDetails.businessId || businessDetails.id
      
      if (!businessId) {
        this.logger.warn(`⚠️ [BUSINESS_VALIDATION] No businessId found in business details for retailer: ${retailerProfile.id}`)
        return {
          valid: false,
          error: 'Pickup Mtaani business ID not found in retailer profile'
        }
      }

      // Validate business ID format (should be a number)
      if (typeof businessId !== 'number' && !/^\d+$/.test(String(businessId))) {
        this.logger.warn(`⚠️ [BUSINESS_VALIDATION] Invalid business ID format: ${businessId} for retailer: ${retailerProfile.id}`)
        return {
          valid: false,
          error: 'Invalid Pickup Mtaani business ID format'
        }
      }

      this.logger.log(`✅ [BUSINESS_VALIDATION] Valid business ID found: ${businessId} for retailer: ${retailerProfile.id}`)
      return {
        valid: true,
        businessId: String(businessId)
      }
    } catch (error) {
      this.logger.error('Error validating retailer business ID:', error)
      return {
        valid: false,
        error: 'Error validating Pickup Mtaani business ID'
      }
    }
  }

  /**
   * Get package status using business ID and package ID
   * @param packageId Pick Up Mtaani package ID
   * @param businessId Pickup Mtaani business ID for the retailer
   * @param isDoorDelivery Optional: whether this is a doorstep package (defaults to trying both)
   * @returns Package status details
   */
  async getPackageStatus(packageId: number, businessId: string, isDoorDelivery?: boolean): Promise<any> {
    try {
      this.logger.log(`📦 Fetching status for package ${packageId}`)

      // If we know it's a doorstep package, use doorstep endpoint
      // Otherwise, try agent-agent first, then doorstep as fallback
      if (isDoorDelivery === true) {
        return this.getPackageStatusFromEndpoint(packageId, businessId, 'doorstep')
      } else if (isDoorDelivery === false) {
        return this.getPackageStatusFromEndpoint(packageId, businessId, 'agent-agent')
      } else {
        // Try both endpoints - start with agent-agent
        try {
          return await this.getPackageStatusFromEndpoint(packageId, businessId, 'agent-agent')
        } catch (error) {
          if (error.response?.status === 404) {
            // If not found in agent-agent, try doorstep
            this.logger.log(`📦 Package ${packageId} not found in agent-agent, trying doorstep endpoint...`)
            try {
              return await this.getPackageStatusFromEndpoint(packageId, businessId, 'doorstep')
            } catch (doorstepError) {
              // If both fail, throw the original error
              throw error
            }
          } else {
            throw error
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch package status for ${packageId}:`,
        error.response?.data || error.message
      )
      throw error
    }
  }

  /**
   * Get package status from a specific endpoint
   * @param packageId Pick Up Mtaani package ID
   * @param businessId Pickup Mtaani business ID for the retailer
   * @param endpoint The endpoint type: 'agent-agent' or 'doorstep'
   * @returns Package status details
   */
  private async getPackageStatusFromEndpoint(packageId: number, businessId: string, endpoint: 'agent-agent' | 'doorstep'): Promise<any> {
    try {
      this.logger.log(`📦 Fetching package ${packageId} status from ${endpoint} endpoint`)

      const response = await axios.get(
        `${this.baseUrl}/packages/${endpoint}?id=${packageId}&b_id=${businessId}`,
        {
          headers: {
            accept: "application/json",
            apiKey: this.apiKey,
          },
          timeout: 10000,
        }
      )

      this.logger.log(
        `✅ Package status retrieved from ${endpoint}: ${response.data.data?.state}`
      )
      
      // Debug: Log the complete response to see what fields are available
      this.logger.log(`🔍 [PACKAGE_STATUS] Complete response:`, JSON.stringify(response.data, null, 2))
      
      return response.data
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch package status from ${endpoint} for ${packageId}:`,
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
   * @param businessId The Pickup Mtaani business ID (required)
   * @returns Array of packages with current status
   */
  async getAllBusinessPackages(businessId: string): Promise<any[]> {
    try {
      if (!businessId) {
        this.logger.warn("⚠️ [GET_PACKAGES] No business ID provided - cannot fetch packages")
        return []
      }

      this.logger.log(
        `📦 [GET_PACKAGES] Fetching all packages from Pick Up Mtaani for business ${businessId}...`
      )

      const response = await axios.get(
        `${this.baseUrl}/packages/my-unpaid-packages?b_id=${businessId}`,
        {
          headers: {
            accept: "application/json",
            apiKey: this.apiKey,
          },
          timeout: 10000,
        }
      )

      this.logger.log(`📦 [GET_PACKAGES] API Response Status: ${response.status}`)
      this.logger.log(`📦 [GET_PACKAGES] API Response Data:`, JSON.stringify(response.data, null, 2))

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
   * Get ALL packages for the business from Pick Up Mtaani (including paid ones)
   * @param businessId The Pickup Mtaani business ID (required)
   * @returns Array of packages with current status
   */
  async getAllBusinessPackagesIncludingPaid(businessId: string): Promise<any[]> {
    try {
      if (!businessId) {
        this.logger.warn("⚠️ [GET_ALL_PACKAGES] No business ID provided - cannot fetch packages")
        return []
      }

      this.logger.log(
        `📦 [GET_ALL_PACKAGES] Fetching ALL packages from Pick Up Mtaani for business ${businessId}...`
      )

      // Try different endpoints to get all packages
      const endpoints = [
        `/packages/my-packages?b_id=${businessId}`,
        `/packages?b_id=${businessId}`,
        `/packages/all?b_id=${businessId}`,
        `/businesses/${businessId}/packages`
      ]

      for (const endpoint of endpoints) {
        try {
          this.logger.log(`📦 [GET_ALL_PACKAGES] Trying endpoint: ${endpoint}`)
          
          const response = await axios.get(
            `${this.baseUrl}${endpoint}`,
            {
              headers: {
                accept: "application/json",
                apiKey: this.apiKey,
              },
              timeout: 10000,
            }
          )

          this.logger.log(`📦 [GET_ALL_PACKAGES] API Response Status: ${response.status}`)
          this.logger.log(`📦 [GET_ALL_PACKAGES] API Response Data:`, JSON.stringify(response.data, null, 2))

          const packages = response.data.data || response.data || []
          this.logger.log(`📦 [GET_ALL_PACKAGES] Found ${packages.length} packages via ${endpoint}`)
          
          if (packages.length > 0) {
            return packages
          }
        } catch (endpointError) {
          this.logger.log(`📦 [GET_ALL_PACKAGES] Endpoint ${endpoint} failed:`, endpointError.response?.status || endpointError.message)
          continue
        }
      }

      this.logger.log(`📦 [GET_ALL_PACKAGES] No packages found via any endpoint`)
      return []
    } catch (error) {
      this.logger.error(
        "❌ [GET_ALL_PACKAGES] Failed to fetch packages:",
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
  async getPackageByIdentifier(identifier: string | number, businessId: string, isDoorDelivery?: boolean): Promise<any> {
    try {
      // Try direct fetch first to get complete package details
      // Try both endpoints if isDoorDelivery is not specified
      const packageResponse = await this.getPackageStatus(Number(identifier), businessId, isDoorDelivery)
      if (packageResponse?.data) {
        return packageResponse.data
      }

      // If direct fetch fails, try searching in all packages as fallback
      const allPackages = await this.getAllBusinessPackages(businessId)
      const packageData = allPackages.find(
        (pkg) =>
          pkg.id === identifier ||
          pkg.receipt_no === identifier ||
          pkg.id === Number(identifier)
      )

      return packageData || null
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
  async getWebhookConfig(businessId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/webhooks?b_id=${businessId}`,
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

  /**
   * Get business categories from Pickup Mtaani
   */
  async getBusinessCategories(): Promise<{
    success: boolean
    data?: BusinessCategory[]
    error?: string
  }> {
    try {
      this.logger.log(`[BUSINESS] Fetching business categories`)

      const response = await axios.get(
        `${this.baseUrl}/businesses/categories`,
        {
          headers: {
            accept: "application/json",
          },
          timeout: 10000,
        }
      )

      this.logger.log(`✅ [BUSINESS] Categories fetched successfully`)
      return { success: true, data: response.data.data }
    } catch (error) {
      this.logger.error(`❌ [BUSINESS] Failed to fetch categories:`, error)
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch business categories",
      }
    }
  }

  /**
   * List all businesses for debugging
   */
  async listAllBusinesses(): Promise<{
    success: boolean
    data?: any[]
    error?: string
  }> {
    try {
      this.logger.log(`[BUSINESS] Listing all businesses for debugging`)

      const response = await axios.get(
        `${this.baseUrl}/businesses`,
        {
          headers: {
            accept: "application/json",
            apiKey: this.apiKey,
          },
          timeout: 10000,
        }
      )

      this.logger.log(`✅ [BUSINESS] Businesses listed successfully`)
      return { success: true, data: response.data.data || response.data }
    } catch (error) {
      this.logger.error(`❌ [BUSINESS] Failed to list businesses:`, error)
      return {
        success: false,
        error: error.response?.data?.message || "Failed to list businesses",
      }
    }
  }

  /**
   * Create business on Pickup Mtaani
   */
  async createBusiness(createBusinessDto: CreateBusinessDto): Promise<{
    success: boolean
    data?: BusinessResponse["data"]
    error?: string
  }> {
    try {
      this.logger.log(`[BUSINESS] Creating business: ${createBusinessDto.name}`)

      const response = await axios.post(
        `${this.baseUrl}/businesses/create`,
        createBusinessDto,
        {
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            "apiKey": this.apiKey,
          },
          timeout: 10000,
        }
      )

      this.logger.log(`✅ [BUSINESS] Business created successfully: ${response.data.data.id}`)
      return { success: true, data: response.data.data }
    } catch (error) {
      this.logger.error(`❌ [BUSINESS] Failed to create business:`, error)
      return {
        success: false,
        error: error.response?.data?.message || "Failed to create business",
      }
    }
  }

  /**
   * Initiate STK push payment for package delivery
   */
  async initiateStkPush(paymentData: {
    packages: Array<{ id: number; type: string }>;
    phone: string;
    businessId: number;
  }): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      this.logger.log(`💳 [STK_PUSH] Initiating STK push for packages:`, paymentData.packages.map(p => p.id).join(', '))
      this.logger.log(`💳 [STK_PUSH] Phone: ${paymentData.phone}`)
      this.logger.log(`💳 [STK_PUSH] Business ID: ${paymentData.businessId}`)

      const url = `${this.baseUrl}/payment/pay-delivery-stk?b_id=${paymentData.businessId}`

      this.logger.log(`💳 [STK_PUSH] API URL: ${url}`)

      const response = await axios.put(url, {
        packages: paymentData.packages,
        phone: paymentData.phone
      }, {
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "apiKey": this.apiKey,
        },
        timeout: 30000, // 30 second timeout for STK push
      })

      this.logger.log(`✅ [STK_PUSH] STK push initiated successfully`)
      this.logger.log(`✅ [STK_PUSH] Response:`, JSON.stringify(response.data, null, 2))

      return { 
        success: true, 
        data: response.data 
      }
    } catch (error) {
      this.logger.error(`❌ [STK_PUSH] Failed to initiate STK push:`, error)
      this.logger.error(`❌ [STK_PUSH] Error details:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      
      return {
        success: false,
        error: error.response?.data?.message || error.message || "Failed to initiate STK push",
      }
    }
  }

  /**
   * Get delivery charge for agent-to-agent package
   * @param senderAgentId The ID of the sender agent
   * @param receiverAgentId The ID of the receiver agent
   * @returns Delivery charge amount
   */
  async getDeliveryCharge(
    senderAgentId: number,
    receiverAgentId: number
  ): Promise<number> {
    try {
      this.logger.log(
        `💰 [DELIVERY_CHARGE] Fetching agent-agent delivery charge: ${senderAgentId} → ${receiverAgentId}`
      )

      const response = await axios.get(
        `${this.baseUrl}/delivery-charge/agent-package?senderAgentID=${senderAgentId}&receiverAgentID=${receiverAgentId}`,
        {
          headers: {
            accept: "application/json",
            apiKey: this.apiKey,
          },
          timeout: 10000,
        }
      )

      const charge = response.data?.data?.price || response.data?.price || 0
      this.logger.log(`💰 [DELIVERY_CHARGE] Agent-agent charge: KES ${charge}`)
      return charge
    } catch (error) {
      this.logger.error(
        "❌ [DELIVERY_CHARGE] Failed to fetch agent-agent delivery charge:",
        error.response?.data || error.message
      )
      return 0
    }
  }

  /**
   * Get delivery charge for door delivery package
   * @param senderAgentId The ID of the sender agent
   * @param doorstepDestinationId The ID of the doorstep destination
   * @returns Delivery charge amount
   */
  async getDoorstepDeliveryCharge(
    senderAgentId: number,
    doorstepDestinationId: number
  ): Promise<number> {
    try {
      this.logger.log(
        `💰 [DELIVERY_CHARGE] Fetching doorstep delivery charge: ${senderAgentId} → ${doorstepDestinationId}`
      )

      const response = await axios.get(
        `${this.baseUrl}/delivery-charge/doorstep-package?senderAgentID=${senderAgentId}&doorstepDestinationID=${doorstepDestinationId}`,
        {
          headers: {
            accept: "application/json",
            apiKey: this.apiKey,
          },
          timeout: 10000,
        }
      )

      this.logger.log(`💰 [DELIVERY_CHARGE] Raw API response:`, JSON.stringify(response.data, null, 2))

      // Pick Up Mtaani API might return data in different structures
      const charge = response.data?.data?.price || 
                    response.data?.price || 
                    (typeof response.data === 'number' ? response.data : 0)
      
      this.logger.log(`💰 [DELIVERY_CHARGE] Extracted doorstep charge: KES ${charge}`)
      return charge
    } catch (error) {
      this.logger.error(
        "❌ [DELIVERY_CHARGE] Failed to fetch doorstep delivery charge:",
        error.response?.data || error.message
      )
      return 0
    }
  }
}
