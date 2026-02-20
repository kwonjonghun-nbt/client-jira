import { schedule as cronSchedule } from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import type { SlackService } from './slack';
import type { SlackSettings, DMReminderSettings } from '../schemas/settings.schema';
import { logger } from '../utils/logger';

export class DMReminderScheduler {
  private tasks: ScheduledTask[] = [];
  private slack: SlackService;

  constructor(slack: SlackService) {
    this.slack = slack;
  }

  start(slackSettings: SlackSettings): void {
    this.stop();

    const { dmReminder, botToken } = slackSettings;

    if (!slackSettings.enabled || !dmReminder.enabled || !botToken) {
      logger.info('DM reminder scheduler disabled or no bot token configured');
      return;
    }

    const enabledUsers = dmReminder.userMappings.filter((m) => m.enabled && m.slackUserId);

    if (enabledUsers.length === 0) {
      logger.info('DM reminder scheduler: no enabled user mappings');
      return;
    }

    for (const schedule of dmReminder.schedules) {
      const [hour, minute] = schedule.time.split(':');
      const cronExpression = `${minute} ${hour} * * 1-5`; // 평일만

      const task = cronSchedule(cronExpression, async () => {
        logger.info(`DM reminder triggered at ${schedule.time}: "${schedule.message}"`);
        await this.sendReminders(botToken, enabledUsers, schedule.message);
      });

      this.tasks.push(task);
      logger.info(`DM reminder scheduled: ${schedule.time} (cron: ${cronExpression})`);
    }
  }

  stop(): void {
    for (const task of this.tasks) {
      task.stop();
    }
    this.tasks = [];
    logger.info('DM reminder scheduler stopped');
  }

  /** 활성화된 모든 사용자에게 DM 전송 */
  private async sendReminders(
    botToken: string,
    users: DMReminderSettings['userMappings'],
    message: string,
  ): Promise<void> {
    let sentCount = 0;

    for (const user of users) {
      try {
        await this.slack.sendDM(botToken, user.slackUserId, message);
        sentCount++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Failed to send DM reminder to ${user.assignee} (${user.slackUserId}): ${message}`);
      }
    }

    logger.info(`DM reminders sent: ${sentCount}/${users.length}`);
  }

  /** 수동 트리거 (테스트용) — 특정 스케줄의 메시지를 즉시 전송 */
  async triggerNow(
    slackSettings: SlackSettings,
    scheduleIndex?: number,
  ): Promise<{ success: boolean; error?: string }> {
    const { dmReminder, botToken } = slackSettings;

    if (!botToken) {
      return { success: false, error: 'Bot Token이 설정되지 않았습니다' };
    }

    const enabledUsers = dmReminder.userMappings.filter((m) => m.enabled && m.slackUserId);
    if (enabledUsers.length === 0) {
      return { success: false, error: '활성화된 사용자가 없습니다' };
    }

    try {
      const schedules = scheduleIndex !== undefined
        ? [dmReminder.schedules[scheduleIndex]].filter(Boolean)
        : dmReminder.schedules;

      for (const schedule of schedules) {
        await this.sendReminders(botToken, enabledUsers, schedule.message);
      }

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
}
