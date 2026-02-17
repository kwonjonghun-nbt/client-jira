import fs from 'node:fs/promises';
import path from 'node:path';
import { getDataDir, getRawDir, getLatestPath, getMetaPath, getSettingsPath, getSnapshotDir, getSnapshotPath, getLabelNotesPath, getReportsDir, getChangelogPath, getOKRPath } from '../utils/paths';
import { StoredDataSchema, MetaDataSchema, LabelNotesDataSchema, ChangelogDataSchema, OKRDataSchema } from '../schemas/storage.schema';
import { SettingsSchema, DEFAULT_SETTINGS } from '../schemas/settings.schema';
import { logger } from '../utils/logger';
import type { StoredData, MetaData, LabelNote, ChangelogData, ChangelogEntry, OKRData } from '../schemas/storage.schema';
import type { Settings } from '../schemas/settings.schema';
import { migrateOKRRelations } from '../utils/okr-migration';

export class StorageService {
  async ensureDirectories(): Promise<void> {
    await fs.mkdir(getDataDir(), { recursive: true });
    await fs.mkdir(getRawDir(), { recursive: true });
  }

  // --- Settings ---

  async loadSettings(): Promise<Settings> {
    const settingsPath = getSettingsPath();
    logger.info(`[Settings] Loading from: ${settingsPath}`);
    try {
      const content = await fs.readFile(settingsPath, 'utf-8');
      logger.info(`[Settings] File content length: ${content.length}`);
      const parsed = JSON.parse(content);
      const result = SettingsSchema.safeParse(parsed);
      if (!result.success) {
        logger.warn('Settings validation failed:', JSON.stringify(result.error));
        return parsed as Settings;
      }
      logger.info(`[Settings] Loaded successfully: baseUrl=${result.data.jira.baseUrl}`);
      return result.data;
    } catch (error: any) {
      logger.warn(`[Settings] Load failed from ${settingsPath}:`, error.message);
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: unknown): Promise<void> {
    const settingsPath = getSettingsPath();
    logger.info(`[Settings] Saving to: ${settingsPath}`);
    const result = SettingsSchema.safeParse(settings);
    if (!result.success) {
      logger.warn('Settings save validation failed, saving raw:', JSON.stringify(result.error));
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    } else {
      await fs.writeFile(settingsPath, JSON.stringify(result.data, null, 2), 'utf-8');
    }
    // 저장 후 파일 존재 확인
    try {
      const stat = await fs.stat(settingsPath);
      logger.info(`[Settings] Saved successfully: ${stat.size} bytes at ${settingsPath}`);
    } catch (e: any) {
      logger.error(`[Settings] File not found after save: ${e.message}`);
    }
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

  // --- Label Notes ---

  async loadLabelNotes(): Promise<LabelNote[]> {
    try {
      const content = await fs.readFile(getLabelNotesPath(), 'utf-8');
      return LabelNotesDataSchema.parse(JSON.parse(content));
    } catch {
      return [];
    }
  }

  async saveLabelNotes(notes: unknown): Promise<void> {
    const validated = LabelNotesDataSchema.parse(notes);
    await fs.writeFile(getLabelNotesPath(), JSON.stringify(validated, null, 2), 'utf-8');
    logger.info(`Label notes saved: ${validated.length} entries`);
  }

  // --- Changelog ---

  async getChangelog(): Promise<ChangelogData | null> {
    try {
      const content = await fs.readFile(getChangelogPath(), 'utf-8');
      return ChangelogDataSchema.parse(JSON.parse(content));
    } catch {
      return null;
    }
  }

  async saveChangelog(data: ChangelogData): Promise<void> {
    const validated = ChangelogDataSchema.parse(data);
    await fs.writeFile(getChangelogPath(), JSON.stringify(validated, null, 2), 'utf-8');
  }

  async appendChangelog(entries: ChangelogEntry[], syncedAt: string): Promise<void> {
    const existing = await this.getChangelog();
    const allEntries = [...entries, ...(existing?.entries ?? [])].slice(0, 500);
    await this.saveChangelog({ syncedAt, entries: allEntries });
    logger.info(`Changelog updated: ${entries.length} new entries (${allEntries.length} total)`);
  }

  // --- OKR ---

  async getOKR(): Promise<OKRData | null> {
    try {
      const content = await fs.readFile(getOKRPath(), 'utf-8');
      const raw = JSON.parse(content);
      const migrated = migrateOKRRelations(raw);
      return OKRDataSchema.parse(migrated);
    } catch {
      return null;
    }
  }

  async saveOKR(data: unknown): Promise<void> {
    const validated = OKRDataSchema.parse(data);
    await fs.writeFile(getOKRPath(), JSON.stringify(validated, null, 2), 'utf-8');
    logger.info(`OKR data saved: ${validated.objectives.length} objectives`);
  }

  // --- Reports ---

  async listReports(): Promise<{ filename: string; title: string; modifiedAt: string }[]> {
    const dir = getReportsDir();
    try {
      await fs.mkdir(dir, { recursive: true });
      const entries = await fs.readdir(dir);
      const mdFiles = entries.filter((e) => e.endsWith('.md'));
      const results: { filename: string; title: string; modifiedAt: string }[] = [];
      for (const file of mdFiles) {
        const stat = await fs.stat(path.join(dir, file));
        results.push({
          filename: file,
          title: file.replace(/\.md$/, ''),
          modifiedAt: stat.mtime.toISOString(),
        });
      }
      results.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
      return results;
    } catch {
      return [];
    }
  }

  async getReport(filename: string): Promise<string | null> {
    try {
      const filePath = path.join(getReportsDir(), filename);
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  async saveReport(filename: string, content: string): Promise<void> {
    const dir = getReportsDir();
    await fs.mkdir(dir, { recursive: true });
    // 파일명에 사용할 수 없는 문자 치환
    const sanitized = filename.replace(/[/\\:*?"<>|]/g, '_');
    const safeName = sanitized.endsWith('.md') ? sanitized : `${sanitized}.md`;
    await fs.writeFile(path.join(dir, safeName), content, 'utf-8');
    logger.info(`Report saved: ${safeName}`);
  }

  async deleteReport(filename: string): Promise<void> {
    const filePath = path.join(getReportsDir(), filename);
    await fs.unlink(filePath);
    logger.info(`Report deleted: ${filename}`);
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
