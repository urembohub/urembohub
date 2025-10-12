import { PrismaService } from "../prisma/prisma.service"
import { PaymentsService } from "../payments/payments.service"
import { ConfigService } from "@nestjs/config"
import { EmailService } from "../email/email.service"
import { PaystackService } from "../paystack/paystack.service"
import { EscrowService } from "../escrow/escrow.service"
import { EnhancedCommissionService } from "../commission/enhanced-commission.service"
import { PickupMtaaniService } from "../pickup-mtaani/pickup-mtaani.service"

async function processExistingOrders() {
  try {
    console.log("🔄 Processing existing confirmed service orders...\n")

    // Initialize services
    const configService = new ConfigService()
    const prisma = new PrismaService(configService)
    const emailService = new EmailService(configService)
    const paystackService = new PaystackService(configService, prisma)
    const escrowService = new EscrowService(
      prisma,
      emailService,
      configService,
      paystackService
    )
    const enhancedCommissionService = new EnhancedCommissionService(prisma)
    const pickupMtaaniService = new PickupMtaaniService(configService)
    const paymentsService = new PaymentsService(
      prisma,
      configService,
      escrowService,
      emailService,
      enhancedCommissionService,
      pickupMtaaniService
    )

    // Get all confirmed service orders that don't have escrows yet
    const confirmedOrders = await prisma.order.findMany({
      where: {
        status: "confirmed",
        serviceAppointments: {
          some: {},
        },
        escrows: {
          none: {},
        },
      },
      include: {
        serviceAppointments: {
          include: {
            service: {
              include: {
                vendor: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    console.log(
      `📋 Found ${confirmedOrders.length} confirmed service orders without escrows`
    )

    if (confirmedOrders.length === 0) {
      console.log("✅ All confirmed service orders already have escrows")
      return
    }

    let processedCount = 0
    let successCount = 0
    let errorCount = 0

    for (const order of confirmedOrders) {
      try {
        console.log(`\n🔄 Processing order ${order.id}...`)
        console.log(
          `   Service Appointments: ${order.serviceAppointments.length}`
        )
        console.log(
          `   Paystack Reference: ${order.paystackReference || "N/A"}`
        )

        if (!order.paystackReference) {
          console.log("   ⚠️  No Paystack reference, skipping...")
          continue
        }

        // Process the payment callback to create escrow
        const result = await paymentsService.handlePaymentCallback(
          order.paystackReference
        )

        if (result.success) {
          console.log(`   ✅ Escrow created successfully`)
          successCount++
        } else {
          console.log(`   ❌ Failed: ${result.message}`)
          errorCount++
        }

        processedCount++

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        console.log(`   ❌ Error processing order ${order.id}:`, error.message)
        errorCount++
        processedCount++
      }
    }

    console.log(`\n📊 Processing Summary:`)
    console.log(`   Total processed: ${processedCount}`)
    console.log(`   Successful: ${successCount}`)
    console.log(`   Errors: ${errorCount}`)

    // Check final escrow stats
    console.log(`\n📊 Final escrow stats:`)
    const stats = await escrowService.getEscrowStats()
    console.log("Escrow Stats:", stats)
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    process.exit(0)
  }
}

processExistingOrders()
