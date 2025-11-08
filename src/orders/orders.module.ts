import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { EmailModule } from '../email/email.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [EmailModule, PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
