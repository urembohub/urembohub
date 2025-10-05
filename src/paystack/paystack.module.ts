import { Module, forwardRef } from '@nestjs/common';
import { PaystackService } from './paystack.service';
import { PaystackController } from './paystack.controller';
import { PaystackCheckoutService } from './paystack-checkout.service';
import { PaystackCheckoutController } from './paystack-checkout.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { CommissionModule } from '../commission/commission.module';

@Module({
  imports: [PrismaModule, forwardRef(() => PaymentsModule), CommissionModule],
  controllers: [PaystackController, PaystackCheckoutController],
  providers: [PaystackService, PaystackCheckoutService],
  exports: [PaystackService, PaystackCheckoutService],
})
export class PaystackModule {}
