import { ipcMain } from 'electron';
import type { AppServices } from '../services/types';

export function registerSlackHandlers(services: AppServices): void {
  ipcMain.handle('slack:test-webhook', async (_event, webhookUrl: string) => {
    if (!services.slack) throw new Error('Slack service not available');
    return services.slack.testWebhook(webhookUrl);
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  });

  ipcMain.handle('slack:test-dm', async (_event, botToken: string, userId: string) => {
    if (!services.slack) throw new Error('Slack service not available');
    return services.slack.testDM(botToken, userId);
  });

}
