import { ipcMain } from 'electron';
import type { AppServices } from '../services/types';

export function registerSlackHandlers(services: AppServices): void {
  ipcMain.handle('slack:test-webhook', async (_event, webhookUrl: string) => {
    if (!services.slack) throw new Error('Slack service not available');
    return services.slack.testWebhook(webhookUrl);
  });

  ipcMain.handle('slack:trigger-daily-report', async () => {
    if (!services.dailyReportScheduler) {
      throw new Error('Daily report scheduler not available');
    }
    return services.dailyReportScheduler.triggerManual();
  });

  ipcMain.handle('slack:test-bot-token', async (_event, botToken: string, channelId: string) => {
    if (!services.slack) throw new Error('Slack service not available');
    return services.slack.testBotToken(botToken, channelId);
  });

  ipcMain.handle('slack:find-thread-message', async (_event, botToken: string, channelId: string, searchText: string) => {
    if (!services.slack) throw new Error('Slack service not available');
    try {
      const found = await services.slack.findTodayMessage(botToken, channelId, searchText);
      if (!found) return { success: true, found: false };
      return { success: true, found: true, text: found.text };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('slack:test-dm', async (_event, botToken: string, userId: string) => {
    if (!services.slack) throw new Error('Slack service not available');
    return services.slack.testDM(botToken, userId);
  });

  ipcMain.handle('slack:trigger-dm-reminder', async () => {
    if (!services.dmReminderScheduler || !services.storage) {
      throw new Error('DM reminder scheduler not available');
    }
    const settings = await services.storage.loadSettings();
    return services.dmReminderScheduler.triggerNow(settings.slack);
  });
}
