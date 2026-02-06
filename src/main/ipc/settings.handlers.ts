import { ipcMain } from 'electron';
import type { AppServices } from '../services/types';
import { reinitializeJiraServices } from '../index';

export function registerSettingsHandlers(services: AppServices): void {
  ipcMain.handle('settings:load', async () => {
    try {
      if (!services.storage) {
        console.log('[DEBUG] settings:load - storage service is null');
        return null;
      }
      const result = await services.storage.loadSettings();
      console.log('[DEBUG] settings:load - result:', JSON.stringify(result));
      return result;
    } catch (error: any) {
      console.error('[DEBUG] settings:load - error:', error.message);
      return null;
    }
  });

  ipcMain.handle('settings:save', async (_event, settings: unknown) => {
    try {
      console.log('[DEBUG] settings:save - received:', JSON.stringify(settings));
      if (!services.storage) {
        console.log('[DEBUG] settings:save - storage service is null');
        return;
      }
      await services.storage.saveSettings(settings);
      console.log('[DEBUG] settings:save - success');
      // Re-initialize Jira services with updated settings
      await reinitializeJiraServices(services);
    } catch (error: any) {
      console.error('[DEBUG] settings:save - error:', error.message);
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
