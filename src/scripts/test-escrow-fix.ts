import { PrismaService } from "../prisma/prisma.service"
import { PaymentsService } from "../payments/payments.service"
import { ConfigService } from "@nestjs/config"
import { EmailService } from "../email/email.service"
import { PaystackService } from "../paystack/paystack.service"
import { EscrowService } from "../escrow/escrow.service"
import { EnhancedCommissionService } from "../commission/enhanced-commission.service"

async function testEscrowFix() {
  try {
    console.log("🔧 Testing escrow fix...\n")

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
    // Mock CommissionQueueService for script
    const commissionQueueService = {
      addCommissionForProcessing: async () => {},
      scheduleReconciliation: async () => {},
      triggerManualReconciliation: async () => {},
    }
    const packageTrackingQueueService = {
      addPackageTrackingJob: async () => {},
      addMultiplePackageTrackingJobs: async () => {},
      getQueueStats: async () => ({}),
      cleanQueue: async () => {},
    } as any
    const paymentsService = new PaymentsService(
      prisma,
      configService,
      escrowService,
      emailService,
      enhancedCommissionService,
      commissionQueueService as any,
    )

    // Get a confirmed service order
    const confirmedOrder = await prisma.order.findFirst({
      where: {
        status: "confirmed",
        serviceAppointments: {
          some: {},
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
    })

    if (!confirmedOrder) {
      console.log("❌ No confirmed service orders found")
      return
    }

    console.log("📋 Found confirmed service order:")
    console.log(`  ID: ${confirmedOrder.id}`)
    console.log(`  Status: ${confirmedOrder.status}`)
    console.log(
      `  Service Appointments: ${confirmedOrder.serviceAppointments.length}`
    )
    console.log(
      `  Paystack Reference: ${confirmedOrder.paystackReference || "N/A"}`
    )

    if (!confirmedOrder.paystackReference) {
      console.log("❌ Order has no Paystack reference, cannot test callback")
      return
    }

    // Test the payment callback
    console.log("\n🔒 Testing payment callback...")
    const result = await paymentsService.handlePaymentCallback(
      confirmedOrder.paystackReference
    )

    console.log("📊 Callback result:", result)

    // Check if escrow was created
    console.log("\n🔍 Checking escrows...")
    const escrows = await prisma.serviceEscrow.findMany({
      where: {
        orderId: confirmedOrder.id,
      },
      include: {
        service: true,
        vendor: true,
      },
    })

    console.log(`📋 Found ${escrows.length} escrows for this order:`)
    escrows.forEach((escrow, index) => {
      console.log(`\nEscrow ${index + 1}:`)
      console.log(`  ID: ${escrow.id}`)
      console.log(`  Service: ${escrow.service?.name || "N/A"}`)
      console.log(`  Vendor: ${escrow.vendor?.fullName || "N/A"}`)
      console.log(`  Amount: ${escrow.amount}`)
      console.log(`  Status: ${escrow.status}`)
    })

    // Check total escrow stats
    console.log("\n📊 Total escrow stats:")
    const stats = await escrowService.getEscrowStats()
    console.log("Escrow Stats:", stats)
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    process.exit(0)
  }
}

testEscrowFix()
