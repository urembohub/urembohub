import { Module, forwardRef } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { EscrowController } from './escrow.controller';
import { EscrowCronService } from './escrow-cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { PaystackModule } from '../paystack/paystack.module';

@Module({
  imports: [PrismaModule, EmailModule, forwardRef(() => PaystackModule)],
  controllers: [EscrowController],
  providers: [EscrowService],
  exports: [EscrowService],
})
export class EscrowModule {}