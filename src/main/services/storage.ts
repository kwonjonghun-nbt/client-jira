import fs from 'node:fs/promises';
import path from 'node:path';
import { getDataDir, getRawDir, getLatestPath, getMetaPath, getSettingsPath, getSnapshotDir, getSnapshotPath } from '../utils/paths';
import { StoredDataSchema, MetaDataSchema } from '../schemas/storage.schema';
import { SettingsSchema, DEFAULT_SETTINGS } from '../schemas/settings.schema';
import { logger } from '../utils/logger';
import type { StoredData, MetaData } from '../schemas/storage.schema';
import type { Settings } from '../schemas/settings.schema';

export class StorageService {
  async ensureDirectories(): Promise<void> {
    await fs.mkdir(getDataDir(), { recursive: true });
    await fs.mkdir(getRawDir(), { recursive: true });
  }

  // --- Settings ---

  async loadSettings(): Promise<Settings> {
    try {
      const content = await fs.readFile(getSettingsPath(), 'utf-8');
      const parsed = JSON.parse(content);
      const result = SettingsSchema.safeParse(parsed);
      if (!result.success) {
        logger.warn('Settings validation failed:', JSON.stringify(result.error));
        return parsed as Settings;
      }
      return result.data;
    } catch (error: any) {
      logger.warn('Settings load failed:', error.message);
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: unknown): Promise<void> {
    const result = SettingsSchema.safeParse(settings);
    if (!result.success) {
      logger.warn('Settings save validation failed, saving raw:', JSON.stringify(result.error));
      await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
    } else {
      await fs.writeFile(getSettingsPath(), JSON.stringify(result.data, null, 2), 'utf-8');
    }
    logger.info('Settings saved');
  }

  // --- Latest Data ---

  async saveLatest(data: StoredData): Promise<void> {
    const validated = StoredDataSchema.parse(data);
    await fs.writeFile(getLatestPath(), JSON.stringify(validated, null, 2), 'utf-8');
    logger.info(`Latest data saved: ${validated.totalCount} issues`);
  }

  async getLatest(): Promise<StoredData | null> {
    try {
      const content = await fs.readFile(getLatestPath(), 'utf-8');
      return StoredDataSchema.parse(JSON.parse(content));
    } catch {
      return null;
    }
  }

  // --- Snapshots ---

  async saveSnapshot(data: StoredData): Promise<void> {
    const now = new Date();
    const snapshotDir = getSnapshotDir(now);
    await fs.mkdir(snapshotDir, { recursive: true });

    const snapshotPath = getSnapshotPath(now);
    const validated = StoredDataSchema.parse(data);
    await fs.writeFile(snapshotPath, JSON.stringify(validated, null, 2), 'utf-8');
    logger.info(`Snapshot saved: ${snapshotPath}`);
  }

  // --- Meta ---

  async getMeta(): Promise<MetaData> {
    try {
      const content = await fs.readFile(getMetaPath(), 'utf-8');
      return MetaDataSchema.parse(JSON.parse(content));
    } catch {
      return { lastSync: null, syncHistory: [] };
    }
  }

  async saveMeta(meta: MetaData): Promise<void> {
    const validated = MetaDataSchema.parse(meta);
    await fs.writeFile(getMetaPath(), JSON.stringify(validated, null, 2), 'utf-8');
  }

  // --- Cleanup ---

  async cleanupOldData(retentionDays: number): Promise<void> {
    const rawDir = getRawDir();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    try {
      const entries = await fs.readdir(rawDir);
      for (const entry of entries) {
        const entryDate = new Date(entry);
        if (!isNaN(entryDate.getTime()) && entryDate < cutoff) {
          await fs.rm(path.join(rawDir, entry), { recursive: true });
          logger.info(`Cleaned up old data: ${entry}`);
        }
      }
    } catch (error: any) {
      logger.warn('Cleanup failed:', error.message);
    }
  }
}
