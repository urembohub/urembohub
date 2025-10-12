import { Module } from '@nestjs/common';
import { CartCleanupService } from './cart-cleanup.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [CartCleanupService, PrismaService],
  exports: [CartCleanupService],
})
export class CartModule {}


