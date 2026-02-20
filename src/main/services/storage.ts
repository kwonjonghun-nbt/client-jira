import fs from 'node:fs/promises';
import path from 'node:path';
import { subDays, compareDesc, parseISO } from 'date-fns';
import { getDataDir, getRawDir, getLatestPath, getMetaPath, getSettingsPath, getSnapshotDir, getSnapshotPath, getLabelNotesPath, getReportsDir, getChangelogPath, getOKRPath } from '../utils/paths';
import { StoredDataSchema, MetaDataSchema, LabelNotesDataSchema, ChangelogDataSchema, OKRDataSchema } from '../schemas/storage.schema';
import { SettingsSchema, DEFAULT_SETTINGS } from '../schemas/settings.schema';
import { logger } from '../utils/logger';
import type { StoredData, MetaData, LabelNote, ChangelogData, ChangelogEntry, OKRData } from '../schemas/storage.schema';
import type { Settings } from '../schemas/settings.schema';
import { migrateOKRRelations } from '../utils/okr-migration';

export class StorageService {
  private writeQueue = Promise.resolve();

  /** Atomic write: write to temp file then rename. Serialized via queue to prevent concurrent writes. */
  private async atomicWrite(filePath: string, content: string): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const tmpPath = filePath + `.tmp-${Date.now()}`;
      await fs.writeFile(tmpPath, content, 'utf-8');
      await fs.rename(tmpPath, filePath);
    });
    return this.writeQueue;
  }

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
        logger.warn('Settings validation failed, merging with defaults:', JSON.stringify(result.error));
        const merged = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...parsed });
        if (merged.success) {
          return merged.data;
        }
        logger.warn('Settings merge with defaults also failed, returning DEFAULT_SETTINGS');
        return DEFAULT_SETTINGS;
      }
      logger.info(`[Settings] Loaded successfully: baseUrl=${result.data.jira.baseUrl}`);
      return result.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`[Settings] Load failed from ${settingsPath}:`, message);
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: unknown): Promise<void> {
    const settingsPath = getSettingsPath();
    logger.info(`[Settings] Saving to: ${settingsPath}`);
    const result = SettingsSchema.safeParse(settings);
    if (!result.success) {
      throw new Error('Settings validation failed: ' + result.error.message);
    }
    await this.atomicWrite(settingsPath, JSON.stringify(result.data, null, 2));
    // 저장 후 파일 존재 확인
    try {
      const stat = await fs.stat(settingsPath);
      logger.info(`[Settings] Saved successfully: ${stat.size} bytes at ${settingsPath}`);
    } catch (e: unknown) {
      const eMsg = e instanceof Error ? e.message : String(e);
      logger.error(`[Settings] File not found after save: ${eMsg}`);
    }
  }

  // --- Latest Data ---

  async saveLatest(data: StoredData): Promise<void> {
    const validated = StoredDataSchema.parse(data);
    await this.atomicWrite(getLatestPath(), JSON.stringify(validated, null, 2));
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
    await this.atomicWrite(getMetaPath(), JSON.stringify(validated, null, 2));
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
    await this.atomicWrite(getLabelNotesPath(), JSON.stringify(validated, null, 2));
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
    await this.atomicWrite(getChangelogPath(), JSON.stringify(validated, null, 2));
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
    await this.atomicWrite(getOKRPath(), JSON.stringify(validated, null, 2));
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
      results.sort((a, b) => compareDesc(parseISO(a.modifiedAt), parseISO(b.modifiedAt)));
      return results;
    } catch {
      return [];
    }
  }

  private validateReportPath(filename: string): string {
    const reportsDir = getReportsDir();
    const filePath = path.resolve(reportsDir, filename);
    if (!filePath.startsWith(reportsDir + path.sep) && filePath !== reportsDir) {
      throw new Error('Invalid report path: path traversal detected');
    }
    return filePath;
  }

  async getReport(filename: string): Promise<string | null> {
    try {
      const filePath = this.validateReportPath(filename);
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
    await this.atomicWrite(path.join(dir, safeName), content);
    logger.info(`Report saved: ${safeName}`);
  }

  async deleteReport(filename: string): Promise<void> {
    const filePath = this.validateReportPath(filename);
    await fs.unlink(filePath);
    logger.info(`Report deleted: ${filename}`);
  }

  // --- Cleanup ---

  async cleanupOldData(retentionDays: number): Promise<void> {
    const rawDir = getRawDir();
    const cutoff = subDays(new Date(), retentionDays);

    try {
      const entries = await fs.readdir(rawDir);
      for (const entry of entries) {
        const entryDate = new Date(entry);
        if (!isNaN(entryDate.getTime()) && entryDate < cutoff) {
          await fs.rm(path.join(rawDir, entry), { recursive: true });
          logger.info(`Cleaned up old data: ${entry}`);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('Cleanup failed:', message);
    }
  }
}
