import { ipcMain } from 'electron';
import type { AppServices } from '../services/types';

export function registerUpdaterHandlers(services: AppServices): void {
  ipcMain.handle('updater:check', async () => {
    await services.updater?.checkForUpdates();
  });

  ipcMain.handle('updater:download', async () => {
    await services.updater?.downloadUpdate();
  });

  ipcMain.handle('updater:install', () => {
    services.updater?.quitAndInstall();
  });
}
