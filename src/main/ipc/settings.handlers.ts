import { ipcMain } from 'electron';
import type { AppServices } from '../services/types';
import { reinitializeJiraServices } from '../services/service-initializer';

export function registerSettingsHandlers(services: AppServices): void {
  ipcMain.handle('settings:load', async () => {
    try {
      if (!services.storage) {
        return null;
      }
      const result = await services.storage.loadSettings();
      if (result && services.credentials) {
        // Restore sensitive fields from encrypted storage into the settings object
        // so that the renderer continues to receive them as part of settings
        const clientSecret = await services.credentials.getGmailClientSecret();
        const botToken = await services.credentials.getSlackBotToken();
        if (result.email && clientSecret) {
          result.email.clientSecret = clientSecret;
        }
        if (result.slack && botToken) {
          result.slack.botToken = botToken;
        }
      }
      return result;
    } catch (error: any) {
      console.error('settings:load - error:', error.message);
      return null;
    }
  });

  ipcMain.handle('settings:save', async (_event, settings: unknown) => {
    try {
      if (!services.storage) {
        return;
      }
      // Migrate sensitive fields out of settings into encrypted credential storage
      if (services.credentials && settings && typeof settings === 'object') {
        const s = settings as Record<string, any>;
        if (s.email && typeof s.email === 'object') {
          const clientSecret = s.email.clientSecret;
          if (clientSecret && typeof clientSecret === 'string' && clientSecret.trim()) {
            await services.credentials.saveGmailClientSecret(clientSecret);
          }
          s.email = { ...s.email, clientSecret: '' };
        }
        if (s.slack && typeof s.slack === 'object') {
          const botToken = s.slack.botToken;
          if (botToken && typeof botToken === 'string' && botToken.trim()) {
            await services.credentials.saveSlackBotToken(botToken);
          }
          s.slack = { ...s.slack, botToken: '' };
        }
      }
      await services.storage.saveSettings(settings);
      // Re-initialize Jira services with updated settings
      await reinitializeJiraServices(services);
    } catch (error: any) {
      console.error('settings:save - error:', error.message);
      throw error;
    }
  });

  ipcMain.handle('settings:save-token', async (_event, token: string) => {
    try {
      if (!services.credentials) return;
      await services.credentials.saveToken(token);
      // Re-initialize with new token
      await reinitializeJiraServices(services);
    } catch (error: any) {
      console.error('Failed to save token:', error.message);
      throw error;
    }
  });

  ipcMain.handle('settings:get-token', async () => {
    try {
      if (!services.credentials) return null;
      return await services.credentials.getToken();
    } catch (error: any) {
      console.error('Failed to get token:', error.message);
      return null;
    }
  });
}
