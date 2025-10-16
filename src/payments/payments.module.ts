import { Module, forwardRef } from "@nestjs/common"
import { PaymentsService } from "./payments.service"
import { PaymentsController } from "./payments.controller"
import { PrismaModule } from "../prisma/prisma.module"
import { EscrowModule } from "../escrow/escrow.module"
import { EmailModule } from "../email/email.module"
import { ConfigModule } from "@nestjs/config"
import { CommissionModule } from "../commission/commission.module"
import { CommissionQueueModule } from "../commission/queue/commission-queue.module"
import { PickupMtaaniModule } from "../pickup-mtaani/pickup-mtaani.module"
import { PackageTrackingQueueModule } from "../pickup-mtaani/package-tracking-queue.module"

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => EscrowModule),
    EmailModule,
    ConfigModule,
    CommissionModule,
    CommissionQueueModule,
    PickupMtaaniModule,
    PackageTrackingQueueModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
