import { autoUpdater } from 'electron-updater';
import type { BrowserWindow } from 'electron';
import { logger } from '../utils/logger';

export class UpdaterService {
  private win: BrowserWindow;

  constructor(win: BrowserWindow) {
    this.win = win;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info) => {
      logger.info(`Update available: v${info.version}`);
      this.send('updater:update-available', { version: info.version });
    });

    autoUpdater.on('update-not-available', () => {
      logger.info('No updates available');
      this.send('updater:update-not-available', {});
    });

    autoUpdater.on('download-progress', (progress) => {
      this.send('updater:download-progress', {
        percent: Math.round(progress.percent),
        transferred: progress.transferred,
        total: progress.total,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      logger.info(`Update downloaded: v${info.version}`);
      this.send('updater:update-downloaded', { version: info.version });
    });

    autoUpdater.on('error', (error) => {
      logger.warn('Update error:', error.message);
      this.send('updater:error', { message: error.message });
    });
  }

  async checkForUpdates(): Promise<void> {
    await autoUpdater.checkForUpdates();
  }

  async downloadUpdate(): Promise<void> {
    await autoUpdater.downloadUpdate();
  }

  quitAndInstall(): void {
    autoUpdater.quitAndInstall();
  }

  private send(channel: string, data: unknown): void {
    if (!this.win.isDestroyed()) {
      this.win.webContents.send(channel, data);
    }
  }
}
