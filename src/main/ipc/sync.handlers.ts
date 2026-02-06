import { ipcMain } from 'electron';
import type { AppServices } from '../services/types';

export function registerSyncHandlers(services: AppServices): void {
  ipcMain.handle('sync:trigger', async () => {
    try {
      if (!services.sync) {
        return { success: false, issueCount: 0, duration: 0, error: 'Sync service not initialized' };
      }
      return await services.sync.performSync('manual', services.mainWindow);
    } catch (error: any) {
      return { success: false, issueCount: 0, duration: 0, error: error.message };
    }
  });

  ipcMain.handle('sync:get-status', async () => {
    try {
      if (!services.sync) {
        return { isRunning: false, lastSync: null, lastResult: null };
      }
      return services.sync.getStatus();
    } catch (error: any) {
      console.error('Failed to get sync status:', error.message);
      return { isRunning: false, lastSync: null, lastResult: null };
    }
  });
}
