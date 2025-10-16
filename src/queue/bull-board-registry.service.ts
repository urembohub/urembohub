import { Injectable, OnModuleInit } from '@nestjs/common';
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { Queue } from 'bullmq';

@Injectable()
export class BullBoardRegistryService implements OnModuleInit {
  private serverAdapter: ExpressAdapter;
  private registeredQueues: Map<string, Queue> = new Map();
  private isInitialized = false;

  onModuleInit() {
    this.initializeBullBoard();
  }

  private initializeBullBoard() {
    if (!this.serverAdapter) {
      this.serverAdapter = new ExpressAdapter();
      this.serverAdapter.setBasePath('/admin/queues');
      this.isInitialized = true;
    }
  }

  /**
   * Register a queue with the Bull Board
   */
  registerQueue(queueName: string, queue: Queue) {
    this.registeredQueues.set(queueName, queue);
    this.updateBullBoard();
  }

  /**
   * Unregister a queue from the Bull Board
   */
  unregisterQueue(queueName: string) {
    this.registeredQueues.delete(queueName);
    this.updateBullBoard();
  }

  /**
   * Get all registered queues
   */
  getRegisteredQueues(): Map<string, Queue> {
    return new Map(this.registeredQueues);
  }

  /**
   * Update the Bull Board with current registered queues
   */
  private updateBullBoard() {
    if (!this.isInitialized) return;

    const queueAdapters = Array.from(this.registeredQueues.values()).map(
      queue => new BullMQAdapter(queue)
    );

    createBullBoard({
      queues: queueAdapters,
      serverAdapter: this.serverAdapter,
    });
  }

  /**
   * Get the server adapter for mounting in Express
   */
  getServerAdapter(): ExpressAdapter {
    if (!this.serverAdapter) {
      this.initializeBullBoard();
    }
    return this.serverAdapter;
  }

  /**
   * Get queue statistics for all registered queues
   */
  async getQueueStats() {
    const stats: Record<string, any> = {};
    
    for (const [queueName, queue] of this.registeredQueues) {
      try {
        const jobCounts = await queue.getJobCounts();
        stats[queueName] = {
          name: this.formatQueueName(queueName),
          ...jobCounts,
        };
      } catch (error) {
        stats[queueName] = {
          name: this.formatQueueName(queueName),
          error: error.message,
        };
      }
    }
    
    return stats;
  }

  /**
   * Get health status for all registered queues
   */
  async getQueueHealth() {
    const health: Record<string, any> = {};
    let overallStatus = 'healthy';
    
    for (const [queueName, queue] of this.registeredQueues) {
      try {
        const isPaused = await queue.isPaused();
        const status = isPaused ? 'paused' : 'running';
        
        if (isPaused) {
          overallStatus = 'degraded';
        }
        
        health[queueName] = {
          name: this.formatQueueName(queueName),
          isPaused,
          status,
        };
      } catch (error) {
        health[queueName] = {
          name: this.formatQueueName(queueName),
          isPaused: false,
          status: 'error',
          error: error.message,
        };
        overallStatus = 'error';
      }
    }
    
    return {
      ...health,
      overall: overallStatus,
    };
  }

  /**
   * Pause a specific queue
   */
  async pauseQueue(queueName: string) {
    const queue = this.registeredQueues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    await queue.pause();
    return { success: true, message: `Queue ${queueName} paused successfully` };
  }

  /**
   * Resume a specific queue
   */
  async resumeQueue(queueName: string) {
    const queue = this.registeredQueues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    await queue.resume();
    return { success: true, message: `Queue ${queueName} resumed successfully` };
  }

  /**
   * Clear a specific queue
   */
  async clearQueue(queueName: string) {
    const queue = this.registeredQueues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    await queue.obliterate({ force: true });
    return { success: true, message: `Queue ${queueName} cleared successfully` };
  }

  /**
   * Format queue name for display
   */
  private formatQueueName(queueName: string): string {
    return queueName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
