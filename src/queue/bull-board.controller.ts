import { Controller, Get, Post, Body, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { BullBoardRegistryService } from './bull-board-registry.service';
import { readFileSync } from 'fs';
import { join } from 'path';

@Controller('admin/queues')
export class BullBoardController {
  constructor(private readonly bullBoardRegistry: BullBoardRegistryService) {}

  @Get('stats')
  async getQueueStats() {
    return await this.bullBoardRegistry.getQueueStats();
  }

  @Get('health')
  async getQueueHealth() {
    return await this.bullBoardRegistry.getQueueHealth();
  }

  @Post(':queueName/pause')
  async pauseQueue(@Param('queueName') queueName: string) {
    return await this.bullBoardRegistry.pauseQueue(queueName);
  }

  @Post(':queueName/resume')
  async resumeQueue(@Param('queueName') queueName: string) {
    return await this.bullBoardRegistry.resumeQueue(queueName);
  }

  @Post(':queueName/clear')
  async clearQueue(@Param('queueName') queueName: string) {
    return await this.bullBoardRegistry.clearQueue(queueName);
  }

  @Get('dashboard')
  getDashboard(@Res() res: Response) {
    try {
      const dashboardPath = join(process.cwd(), 'src', 'queue', 'queue-dashboard.html');
      const dashboardContent = readFileSync(dashboardPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.send(dashboardContent);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      res.status(500).send('Error loading dashboard: ' + error.message);
    }
  }
}
