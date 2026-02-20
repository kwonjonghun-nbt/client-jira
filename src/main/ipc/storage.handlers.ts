import { ipcMain } from 'electron';
import type { AppServices } from '../services/types';

export function registerStorageHandlers(services: AppServices): void {
  ipcMain.handle('storage:get-latest', async () => {
    try {
      if (!services.storage) return null;
      return await services.storage.getLatest();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to get latest data:', message);
      return null;
    }
  });

  ipcMain.handle('storage:get-label-notes', async () => {
    try {
      if (!services.storage) return [];
      return await services.storage.loadLabelNotes();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to get label notes:', message);
      return [];
    }
  });

  ipcMain.handle('storage:save-label-notes', async (_event, data: unknown) => {
    try {
      if (!services.storage) return;
      await services.storage.saveLabelNotes(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to save label notes:', message);
    }
  });

  ipcMain.handle('storage:list-reports', async () => {
    try {
      if (!services.storage) return [];
      return await services.storage.listReports();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to list reports:', message);
      return [];
    }
  });

  ipcMain.handle('storage:get-report', async (_event, filename: string) => {
    try {
      if (!services.storage) return null;
      return await services.storage.getReport(filename);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to get report:', message);
      return null;
    }
  });

  ipcMain.handle('storage:save-report', async (_event, filename: string, content: string) => {
    try {
      if (!services.storage) return;
      await services.storage.saveReport(filename, content);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to save report:', message);
    }
  });

  ipcMain.handle('storage:delete-report', async (_event, filename: string) => {
    try {
      if (!services.storage) return;
      await services.storage.deleteReport(filename);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to delete report:', message);
    }
  });

  ipcMain.handle('storage:get-meta', async () => {
    try {
      if (!services.storage) {
        return { lastSync: null, syncHistory: [] };
      }
      return await services.storage.getMeta();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to get meta:', message);
      return { lastSync: null, syncHistory: [] };
    }
  });

  ipcMain.handle('storage:get-changelog', async () => {
    try {
      if (!services.storage) return null;
      return await services.storage.getChangelog();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to get changelog:', message);
      return null;
    }
  });

  ipcMain.handle('storage:get-okr', async () => {
    try {
      if (!services.storage) return null;
      return await services.storage.getOKR();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to get OKR data:', message);
      return null;
    }
  });

  ipcMain.handle('storage:save-okr', async (_event, data: unknown) => {
    try {
      if (!services.storage) return;
      await services.storage.saveOKR(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to save OKR data:', message);
    }
  });
}
