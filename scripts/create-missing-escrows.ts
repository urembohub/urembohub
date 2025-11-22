import { PrismaClient, EscrowStatus } from '@prisma/client';
import { EscrowService } from '../src/escrow/escrow.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service';
import { ConfigService } from '@nestjs/config';
import { PaystackService } from '../src/paystack/paystack.service';

const prisma = new PrismaClient();

async function createMissingEscrows() {
  console.log('🔍 Finding orders that should have escrows but don\'t...\n');

  try {
    // Find orders with service appointments that are paid/confirmed but don't have escrows
    const ordersNeedingEscrows = await prisma.order.findMany({
      where: {
        serviceAppointments: {
          some: {},
        },
        OR: [
          { paymentStatus: 'paid' },
          { paymentStatus: 'processing' },
          { status: 'paid' },
          { status: 'confirmed' },
        ],
      },
      include: {
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
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    console.log(`Found ${ordersNeedingEscrows.length} orders that might need escrows\n`);

    if (ordersNeedingEscrows.length === 0) {
      console.log('✅ No orders found that need escrows');
      return;
    }

    // Check which ones already have escrows
    const ordersWithEscrows = await prisma.serviceEscrow.findMany({
      select: {
        orderId: true,
      },
      distinct: ['orderId'],
    });

    const orderIdsWithEscrows = new Set(ordersWithEscrows.map(e => e.orderId));

    let createdCount = 0;
    let skippedCount = 0;

    for (const order of ordersNeedingEscrows) {
      // Skip if escrows already exist for this order
      if (orderIdsWithEscrows.has(order.id)) {
        console.log(`⏭️  Skipping order ${order.id} - escrows already exist`);
        skippedCount++;
        continue;
      }

      console.log(`\n📦 Processing order: ${order.id}`);
      console.log(`   Status: ${order.status}, Payment Status: ${order.paymentStatus}`);
      console.log(`   Service Appointments: ${order.serviceAppointments.length}`);

      // Use payment reference or generate a placeholder
      const paymentReference = order.paymentReference || `manual_${order.id}_${Date.now()}`;
      if (!order.paymentReference) {
        console.log(`   ⚠️  No payment reference found - using placeholder: ${paymentReference}`);
      }

      // Create escrow service instance (simplified - we'll use Prisma directly)
      for (const appointment of order.serviceAppointments) {
        if (!appointment.service || !appointment.service.vendor) {
          console.log(`   ⚠️  Skipping appointment - missing service or vendor`);
          continue;
        }

        // Check if escrow already exists for this service appointment
        const existingEscrow = await prisma.serviceEscrow.findFirst({
          where: {
            orderId: order.id,
            serviceId: appointment.service.id,
            vendorId: appointment.service.vendor.id,
          },
        });

        if (existingEscrow) {
          console.log(`   ⏭️  Escrow already exists for service: ${appointment.service.name}`);
          continue;
        }

        // Calculate auto-release date (48 hours from now)
        const autoReleaseDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

        try {
          const escrow = await prisma.serviceEscrow.create({
            data: {
              orderId: order.id,
              serviceId: appointment.service.id,
              vendorId: appointment.service.vendor.id,
              customerId: order.userId || undefined,
              amount: Number(appointment.servicePrice),
              currency: appointment.currency || 'KES',
              paystackReference: paymentReference,
              autoReleaseDate,
              status: EscrowStatus.pending,
              createdBy: appointment.service.vendor.id,
            },
          });

          // Create action log
          await prisma.escrowAction.create({
            data: {
              escrowId: escrow.id,
              actionType: 'created',
              performedBy: appointment.service.vendor.id,
              metadata: {
                orderId: order.id,
                serviceId: appointment.service.id,
                amount: Number(appointment.servicePrice),
                autoReleaseDate: autoReleaseDate.toISOString(),
                createdManually: true,
              },
            },
          });

          console.log(`   ✅ Created escrow for: ${appointment.service.name}`);
          console.log(`      Amount: ${appointment.servicePrice} ${appointment.currency || 'KES'}`);
          console.log(`      Vendor: ${appointment.service.vendor.businessName || appointment.service.vendor.fullName}`);
          createdCount++;
        } catch (error: any) {
          console.error(`   ❌ Failed to create escrow: ${error.message}`);
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${createdCount} escrows`);
    console.log(`   Skipped: ${skippedCount} orders`);
    console.log(`\n✅ Done!`);

  } catch (error) {
    console.error('❌ Error creating missing escrows:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createMissingEscrows()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

