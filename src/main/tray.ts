import { Tray, Menu, nativeImage, BrowserWindow } from 'electron';
import path from 'node:path';
import type { SyncService } from './services/sync';
import type { SchedulerService } from './services/scheduler';
import type { Schedule } from './schemas/settings.schema';

export class TrayService {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow;
  private syncService: SyncService | null;
  private scheduler: SchedulerService | null;
  private schedule: Schedule | null;

  constructor(
    mainWindow: BrowserWindow,
    syncService: SyncService | null,
    scheduler: SchedulerService | null,
    schedule: Schedule | null,
  ) {
    this.mainWindow = mainWindow;
    this.syncService = syncService;
    this.scheduler = scheduler;
    this.schedule = schedule;
  }

  create(): void {
    // macOS 16x16 template image for tray
    const icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADpSURBVDiNpZMxDoJAEEX/LBYUW1h5AK/gJbyAV/AKXsFb2HoFG29gZWdBYmNBQsFgYbJhWVjUn0wy2Zn/ZnYmC/xTjHEcQAKgPwDMAeyBK4ALMJVSqgB2AI4ArgAagCOAFTOrgBYALjN7ALYB/AXSdEH+RJIEAkAZgKOUUhXABTNb1gJMynYECQBFANZVnVTVJfcC+OG8ATAD0E/rM8vJOIBz2gNgBeCcbJwBfDIMIwDdpO/Gcmg+iB+ANBllJKR5EjhmGkdSXfDpCfwDcpLRZbRLAJj9A6JR+AABKiTbAAAA' +
      'ABJRU5ErkJggg==',
    );
    icon.setTemplateImage(true);

    this.tray = new Tray(icon.resize({ width: 16, height: 16 }));
    this.tray.setToolTip('Client Jira');
    this.updateMenu();
  }

  updateMenu(): void {
    if (!this.tray) return;

    const status = this.syncService?.getStatus();
    const nextRun = this.scheduler && this.schedule
      ? this.scheduler.getNextRunTime(this.schedule)
      : null;

    const lastSyncLabel = status?.lastSync
      ? `마지막: ${new Date(status.lastSync).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
      : '마지막: 없음';

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '지금 싱크',
        click: async () => {
          if (this.syncService) {
            await this.syncService.performSync('manual', this.mainWindow);
            this.updateMenu();
          }
        },
      },
      { type: 'separator' },
      { label: lastSyncLabel, enabled: false },
      { label: nextRun ? `다음: ${nextRun}` : '다음: -', enabled: false },
      { type: 'separator' },
      {
        label: '자동 수집',
        type: 'checkbox',
        checked: this.schedule?.enabled ?? false,
      },
      {
        label: '대시보드 열기',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
        },
      },
      { type: 'separator' },
      {
        label: '종료',
        click: () => {
          this.mainWindow.destroy();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  updateServices(
    syncService: SyncService | null,
    scheduler: SchedulerService | null,
    schedule: Schedule | null,
  ): void {
    this.syncService = syncService;
    this.scheduler = scheduler;
    this.schedule = schedule;
    this.updateMenu();
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}
