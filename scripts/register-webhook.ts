/**
 * Script to register webhook URL with Pick Up Mtaani
 * Run this once to enable instant payment notifications
 *
 * Usage:
 *   npm run register-webhook
 *
 * Or with custom URL:
 *   WEBHOOK_URL=https://your-domain.com/api/webhooks/pickup-mtaani npm run register-webhook
 */

import { NestFactory } from "@nestjs/core"
import { AppModule } from "../src/app.module"
import { PickupMtaaniService } from "../src/pickup-mtaani/pickup-mtaani.service"

async function registerWebhook() {
  console.log("🚀 [WEBHOOK] Starting webhook registration...")

  try {
    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule)

    // Get PickupMtaaniService
    const pickupMtaaniService = app.get(PickupMtaaniService)

    // Get webhook URL from environment or use default
    const webhookUrl =
      process.env.WEBHOOK_URL ||
      process.env.APP_URL + "/api/webhooks/pickup-mtaani" ||
      "https://your-domain.com/api/webhooks/pickup-mtaani"

    console.log(`📡 [WEBHOOK] Registering webhook URL: ${webhookUrl}`)
    console.log(
      `ℹ️  [WEBHOOK] Make sure this URL is publicly accessible and HTTPS enabled`
    )
    console.log("")

    // Register webhook
    const result = await pickupMtaaniService.registerWebhook(webhookUrl)

    if (result.success) {
      console.log("")
      console.log("✅ [WEBHOOK] Webhook registered successfully!")
      console.log("")
      console.log("📋 [WEBHOOK] Registration Details:")
      console.log(JSON.stringify(result.data, null, 2))
      console.log("")
      console.log("🎉 [WEBHOOK] Setup Complete!")
      console.log("")
      console.log("📝 [WEBHOOK] Next Steps:")
      console.log("   1. Verify your server is running and accessible")
      console.log("   2. Test with a real payment")
      console.log(
        "   3. Monitor logs for webhook events: npm run start:dev | grep WEBHOOK"
      )
      console.log("")
    } else {
      console.log("")
      console.log("❌ [WEBHOOK] Failed to register webhook")
      console.log("")
      console.log("Error details:")
      console.log(JSON.stringify(result.error, null, 2))
      console.log("")
      console.log("💡 [WEBHOOK] Possible solutions:")
      console.log("   1. Check your PICKUP_MTAANI_API_KEY is correct")
      console.log("   2. Verify webhook URL is publicly accessible")
      console.log("   3. Ensure URL uses HTTPS (required for webhooks)")
      console.log("   4. Check Pick Up Mtaani API documentation")
      console.log("")
    }

    // Test webhook endpoint (optional)
    console.log("🧪 [WEBHOOK] Testing webhook endpoint...")
    const testResult = await pickupMtaaniService.testWebhook(webhookUrl)

    if (testResult.success) {
      console.log("✅ [WEBHOOK] Webhook test successful!")
    } else {
      console.log("ℹ️  [WEBHOOK] Webhook test not available (this is optional)")
    }

    // Note: Webhook config requires a specific business ID, so we skip it here
    // The webhook registration itself doesn't require a business ID

    await app.close()
    process.exit(0)
  } catch (error) {
    console.error("")
    console.error("❌ [WEBHOOK] Fatal error:", error.message)
    console.error("")
    console.error("Stack trace:")
    console.error(error.stack)
    console.error("")
    process.exit(1)
  }
}

// Run the script
registerWebhook()

