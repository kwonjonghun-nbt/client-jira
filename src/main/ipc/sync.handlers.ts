import { ipcMain } from 'electron';
import type { AppServices } from '../services/types';
import { reinitializeJiraServices } from '../services/service-initializer';

export function registerSyncHandlers(services: AppServices): void {
  ipcMain.handle('sync:trigger', async () => {
    try {
      // Lazy-initialize if services aren't ready yet
      if (!services.sync) {
        await reinitializeJiraServices(services);
      }
      if (!services.sync) {
        return { success: false, issueCount: 0, duration: 0, error: 'Jira 설정을 먼저 완료해주세요' };
      }
      return await services.sync.performSync('manual', services.mainWindow);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, issueCount: 0, duration: 0, error: message };
    }
  });

  ipcMain.handle('sync:get-status', async () => {
    try {
      if (!services.sync) {
        return { isRunning: false, lastSync: null, lastResult: null };
      }
      return services.sync.getStatus();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to get sync status:', message);
      return { isRunning: false, lastSync: null, lastResult: null };
    }
  });
}
