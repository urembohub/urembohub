import { Module } from "@nestjs/common"
import { HttpModule } from "@nestjs/axios"
import { ConfigModule } from "@nestjs/config"
import { PickupMtaaniService } from "./pickup-mtaani.service"
import { PickupMtaaniController } from "./pickup-mtaani.controller"
import { WebhookController } from "./webhook.controller"
import { PaymentVerificationService } from "./payment-verification.service"
import { PrismaModule } from "../prisma/prisma.module"

/**
 * Module for Pick Up Mtaani delivery integration
 * Handles shipping package creation for RETAILER product orders only
 * Provides endpoints to fetch retailer-specific packages with real-time status
 * Includes automatic payment verification via:
 * - Webhooks (instant, primary method)
 * - Background jobs (backup for missed webhooks)
 */
@Module({
  imports: [HttpModule, ConfigModule, PrismaModule],
  controllers: [PickupMtaaniController, WebhookController],
  providers: [PickupMtaaniService, PaymentVerificationService],
  exports: [PickupMtaaniService, PaymentVerificationService],
})
export class PickupMtaaniModule {}
