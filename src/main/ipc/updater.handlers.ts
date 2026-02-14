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
    services.updater.checkForUpdates();
  });

  ipcMain.handle('updater:install', () => {
    services.updater?.quitAndInstall();
  });
}
