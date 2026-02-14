import { ipcMain, BrowserWindow } from 'electron';
import type { AppServices } from '../services/types';

export function registerUpdaterHandlers(services: AppServices): void {
  ipcMain.handle('updater:check', async (event) => {
    if (!services.updater) {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        win.webContents.send('updater:update-not-available', {});
      }
      return;
    }
    await services.updater.checkForUpdates();
  });

  ipcMain.handle('updater:download', async () => {
    await services.updater?.downloadUpdate();
  });

  ipcMain.handle('updater:install', () => {
    services.updater?.quitAndInstall();
  });
}
