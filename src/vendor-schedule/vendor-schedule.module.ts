import { Module } from '@nestjs/common';
import { VendorScheduleService } from './vendor-schedule.service';
import { VendorScheduleController } from './vendor-schedule.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VendorScheduleController],
  providers: [VendorScheduleService],
  exports: [VendorScheduleService],
})
export class VendorScheduleModule {}


