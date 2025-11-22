import { Module, forwardRef } from '@nestjs/common';
import { ManufacturerOrdersController } from './manufacturer-orders.controller';
import { ManufacturerOrdersService } from './manufacturer-orders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaystackModule } from '../paystack/paystack.module';
import { PickupMtaaniModule } from '../pickup-mtaani/pickup-mtaani.module';

@Module({
  imports: [PrismaModule, forwardRef(() => PaystackModule), PickupMtaaniModule],
  controllers: [ManufacturerOrdersController],
  providers: [ManufacturerOrdersService],
  exports: [ManufacturerOrdersService],
})
export class ManufacturerOrdersModule {}


