import { schedule as cronSchedule } from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import type { BrowserWindow } from 'electron';
import type { SyncService } from './sync';
import type { Schedule } from '../schemas/settings.schema';
import { logger } from '../utils/logger';

export class SchedulerService {
  private tasks: ScheduledTask[] = [];
  private syncService: SyncService;
  private mainWindow: BrowserWindow | null;

  constructor(syncService: SyncService, mainWindow: BrowserWindow | null) {
    this.syncService = syncService;
    this.mainWindow = mainWindow;
  }

  start(schedule: Schedule): void {
    this.stop();

    if (!schedule.enabled) {
      logger.info('Scheduler disabled');
      return;
    }

    for (const time of schedule.times) {
      const [hour, minute] = time.split(':');
      const cronExpression = `${minute} ${hour} * * *`;

      const task = cronSchedule(cronExpression, async () => {
        logger.info(`Scheduled sync triggered at ${time}`);
        await this.syncService.performSync('scheduled', this.mainWindow);
      });

      this.tasks.push(task);
      logger.info(`Scheduled sync for ${time} (cron: ${cronExpression})`);
    }
  }

  stop(): void {
    for (const task of this.tasks) {
      task.stop();
    }
    this.tasks = [];
    logger.info('Scheduler stopped');
  }

  updateWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  getNextRunTime(schedule: Schedule): string | null {
    if (!schedule.enabled || schedule.times.length === 0) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const sortedTimes = [...schedule.times].sort();

    for (const time of sortedTimes) {
      const [h, m] = time.split(':').map(Number);
      const timeMinutes = h * 60 + m;
      if (timeMinutes > currentMinutes) {
        return time;
      }
    }

    // 오늘 남은 시간이 없으면 내일 첫 시간
    return sortedTimes[0];
  }
}
