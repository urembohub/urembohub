import { Module } from '@nestjs/common';
import { CartCleanupService } from './cart-cleanup.service';
import { CartCleanupController } from './cart-cleanup.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [CartCleanupService, PrismaService],
  controllers: [CartCleanupController],
  exports: [CartCleanupService],
})
export class CartModule {}
