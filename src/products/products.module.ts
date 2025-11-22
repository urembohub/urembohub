import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ManufacturerOrdersModule } from '../manufacturer-orders/manufacturer-orders.module';

@Module({
  imports: [ManufacturerOrdersModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
