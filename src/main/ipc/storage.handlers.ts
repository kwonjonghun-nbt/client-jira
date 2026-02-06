import { ipcMain } from 'electron';
import type { AppServices } from '../services/types';

export function registerStorageHandlers(services: AppServices): void {
  ipcMain.handle('storage:get-latest', async () => {
    try {
      if (!services.storage) return null;
      return await services.storage.getLatest();
    } catch (error: any) {
      console.error('Failed to get latest data:', error.message);
      return null;
    }
  });

  ipcMain.handle('storage:get-meta', async () => {
    try {
      if (!services.storage) {
        return { lastSync: null, syncHistory: [] };
      }
      return await services.storage.getMeta();
    } catch (error: any) {
      console.error('Failed to get meta:', error.message);
      return { lastSync: null, syncHistory: [] };
    }
  });
}
