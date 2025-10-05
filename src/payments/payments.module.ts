import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EscrowModule } from '../escrow/escrow.module';
import { EmailModule } from '../email/email.module';
import { ConfigModule } from '@nestjs/config';
import { CommissionModule } from '../commission/commission.module';

@Module({
  imports: [PrismaModule, forwardRef(() => EscrowModule), EmailModule, ConfigModule, CommissionModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
