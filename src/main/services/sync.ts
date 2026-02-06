import type { BrowserWindow } from 'electron';
import type { JiraClient } from './jira-client';
import type { StorageService } from './storage';
import type { StoredData, SyncHistoryEntry, SyncStatus } from '../schemas/storage.schema';
import type { Settings } from '../schemas/settings.schema';
import { normalizeIssues } from '../utils/normalize';
import { logger } from '../utils/logger';

export interface SyncResult {
  success: boolean;
  issueCount: number;
  duration: number;
  error?: string;
}

export class SyncService {
  private storage: StorageService;
  private jiraClient: JiraClient;
  private settings: Settings;
  private isRunning = false;
  private lastResult: SyncHistoryEntry | null = null;
  private lastSyncTime: string | null = null;

  constructor(storage: StorageService, jiraClient: JiraClient, settings: Settings) {
    this.storage = storage;
    this.jiraClient = jiraClient;
    this.settings = settings;
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
  }

  updateJiraClient(client: JiraClient): void {
    this.jiraClient = client;
  }

  async performSync(type: 'scheduled' | 'manual', mainWindow?: BrowserWindow | null): Promise<SyncResult> {
    if (this.isRunning) {
      return { success: false, issueCount: 0, duration: 0, error: '동기화가 이미 진행 중입니다' };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const { collection } = this.settings;
      const jql = this.jiraClient.buildJql(
        collection.projects,
        collection.assignees,
        collection.customJql,
      );

      logger.info(`Sync started (${type}): ${jql}`);

      const rawIssues = await this.jiraClient.fetchAllIssues(jql, (current, total) => {
        mainWindow?.webContents.send('sync:progress', {
          current,
          total,
          percentage: total > 0 ? Math.round((current / total) * 100) : 0,
        });
      });

      const issues = normalizeIssues(rawIssues);
      const duration = Date.now() - startTime;

      const data: StoredData = {
        syncedAt: new Date().toISOString(),
        source: {
          baseUrl: this.settings.jira.baseUrl,
          projects: collection.projects,
        },
        issues,
        totalCount: issues.length,
      };

      await this.storage.saveLatest(data);
      await this.storage.saveSnapshot(data);

      // Update meta
      const meta = await this.storage.getMeta();
      const historyEntry: SyncHistoryEntry = {
        timestamp: data.syncedAt,
        type,
        issueCount: issues.length,
        duration,
        success: true,
      };
      meta.lastSync = data.syncedAt;
      meta.syncHistory.unshift(historyEntry);
      meta.syncHistory = meta.syncHistory.slice(0, 100);
      await this.storage.saveMeta(meta);

      this.lastResult = historyEntry;
      this.lastSyncTime = data.syncedAt;

      // Cleanup old data
      await this.storage.cleanupOldData(this.settings.storage.retentionDays);

      logger.info(`Sync completed: ${issues.length} issues in ${duration}ms`);
      mainWindow?.webContents.send('sync:complete');

      return { success: true, issueCount: issues.length, duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`Sync failed:`, error.message);

      const meta = await this.storage.getMeta();
      const historyEntry: SyncHistoryEntry = {
        timestamp: new Date().toISOString(),
        type,
        issueCount: 0,
        duration,
        success: false,
        error: error.message,
      };
      meta.syncHistory.unshift(historyEntry);
      meta.syncHistory = meta.syncHistory.slice(0, 100);
      await this.storage.saveMeta(meta);

      this.lastResult = historyEntry;

      return { success: false, issueCount: 0, duration, error: error.message };
    } finally {
      this.isRunning = false;
    }
  }

  getStatus(): SyncStatus {
    return {
      isRunning: this.isRunning,
      lastSync: this.lastSyncTime,
      lastResult: this.lastResult,
    };
  }
}
