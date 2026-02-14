import { autoUpdater } from 'electron';
import type { BrowserWindow } from 'electron';
import { logger } from '../utils/logger';

const FEED_URL = 'https://github.com/kwonjonghun-nbt/client-jira/releases/latest/download';

export class UpdaterService {
  private win: BrowserWindow;

  constructor(win: BrowserWindow) {
    this.win = win;

    autoUpdater.setFeedURL({ url: FEED_URL, serverType: 'json' });

    autoUpdater.on('update-available', () => {
      logger.info('Update available, downloading...');
      this.send('updater:update-available', {});
    });

    autoUpdater.on('update-not-available', () => {
      logger.info('No updates available');
      this.send('updater:update-not-available', {});
    });

    autoUpdater.on('update-downloaded', (_event, releaseNotes, releaseName) => {
      logger.info(`Update downloaded: ${releaseName}`);
      this.send('updater:update-downloaded', { version: releaseName });
    });

    autoUpdater.on('error', (error) => {
      logger.warn('Update error:', error.message);
      this.send('updater:error', { message: error.message });
    });
  }

  checkForUpdates(): void {
    autoUpdater.checkForUpdates();
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
