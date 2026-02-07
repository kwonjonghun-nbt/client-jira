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

  ipcMain.handle('storage:get-label-notes', async () => {
    try {
      if (!services.storage) return [];
      return await services.storage.loadLabelNotes();
    } catch (error: any) {
      console.error('Failed to get label notes:', error.message);
      return [];
    }
  });

  ipcMain.handle('storage:save-label-notes', async (_event, data: unknown) => {
    try {
      if (!services.storage) return;
      await services.storage.saveLabelNotes(data);
    } catch (error: any) {
      console.error('Failed to save label notes:', error.message);
    }
  });

  ipcMain.handle('storage:list-reports', async () => {
    try {
      if (!services.storage) return [];
      return await services.storage.listReports();
    } catch (error: any) {
      console.error('Failed to list reports:', error.message);
      return [];
    }
  });

  ipcMain.handle('storage:get-report', async (_event, filename: string) => {
    try {
      if (!services.storage) return null;
      return await services.storage.getReport(filename);
    } catch (error: any) {
      console.error('Failed to get report:', error.message);
      return null;
    }
  });

  ipcMain.handle('storage:save-report', async (_event, filename: string, content: string) => {
    try {
      if (!services.storage) return;
      await services.storage.saveReport(filename, content);
    } catch (error: any) {
      console.error('Failed to save report:', error.message);
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
