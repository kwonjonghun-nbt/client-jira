import { ipcMain } from 'electron';
import type { AppServices } from '../services/types';

export function registerSlackHandlers(services: AppServices): void {
  ipcMain.handle('slack:test-webhook', async (_event, webhookUrl: string) => {
    if (!services.slack) throw new Error('Slack service not available');
    return services.slack.testWebhook(webhookUrl);
  });

  ipcMain.handle('slack:trigger-daily-report', async () => {
    if (!services.dailyReportScheduler || !services.storage) {
      throw new Error('Daily report scheduler not available');
    }
    const settings = await services.storage.loadSettings();
    if (!settings.slack.webhookUrl) {
      return { success: false, error: 'Webhook URL not configured' };
    }
    return services.dailyReportScheduler.generateAndSendReports(settings.slack.webhookUrl);
  });
}
