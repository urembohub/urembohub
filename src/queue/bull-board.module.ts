import { Module, Global } from '@nestjs/common';
import { BullBoardController } from './bull-board.controller';
import { BullBoardRegistryService } from './bull-board-registry.service';
import { CommissionQueueModule } from '../commission/queue/commission-queue.module';
import { QueueModule } from './queue.module';

@Global()
@Module({
  imports: [
    QueueModule,
    CommissionQueueModule,
  ],
  controllers: [BullBoardController],
  providers: [BullBoardRegistryService],
  exports: [BullBoardRegistryService],
})
export class QueueBullBoardModule {}
