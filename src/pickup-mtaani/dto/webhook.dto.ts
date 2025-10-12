/**
 * DTOs for Pick Up Mtaani Webhook Events
 */

/**
 * Webhook event types from Pick Up Mtaani
 */
export enum PickupMtaaniWebhookEvent {
  PACKAGE_CREATED = "package.created",
  PACKAGE_UPDATED = "package.updated",
  PAYMENT_COMPLETED = "payment.completed",
  PAYMENT_FAILED = "payment.failed",
  PACKAGE_IN_TRANSIT = "package.in_transit",
  PACKAGE_DELIVERED = "package.delivered",
}

/**
 * Base webhook payload structure
 */
export interface PickupMtaaniWebhookPayload {
  event: string // Event type
  timestamp: string // ISO 8601 timestamp
  data: PackageWebhookData
  signature?: string // Webhook signature for verification
}

/**
 * Package data in webhook payload
 */
export interface PackageWebhookData {
  id: number // Package ID
  receipt_no: string // Receipt number
  state: string // Current status
  delivery_fee: number
  sender_agent_id: number
  receiver_agent_id: number
  package_name?: string
  package_value?: number
  payment_status?: string
  transaction_code?: string // M-Pesa transaction code
  paid_at?: string // ISO 8601 timestamp
  updated_at: string
  metadata?: Record<string, any>
}

/**
 * Webhook registration request
 */
export interface WebhookRegistrationDto {
  webhook_url: string
  events?: string[] // Specific events to subscribe to
}

/**
 * Webhook registration response
 */
export interface WebhookRegistrationResponse {
  success: boolean
  webhook_id?: string
  webhook_url: string
  events?: string[]
  message?: string
}

