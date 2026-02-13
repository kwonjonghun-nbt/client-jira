import { app } from 'electron';
import path from 'node:path';

export function getDataDir(): string {
  return path.join(app.getPath('userData'), 'data');
}

export function getRawDir(): string {
  return path.join(getDataDir(), 'raw');
}

export function getLatestPath(): string {
  return path.join(getDataDir(), 'latest.json');
}

export function getMetaPath(): string {
  return path.join(getDataDir(), 'meta.json');
}

export function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function getTokenPath(): string {
  return path.join(app.getPath('userData'), 'token.enc');
}

export function getLabelNotesPath(): string {
  return path.join(app.getPath('userData'), 'label-notes.json');
}

export function getReportsDir(): string {
  return path.join(app.getPath('userData'), 'reports');
}

export function getSnapshotDir(date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  return path.join(getRawDir(), dateStr);
}

export function getSnapshotPath(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return path.join(getSnapshotDir(date), `${hours}-${minutes}.json`);
}

export function getChangelogPath(): string {
  return path.join(getDataDir(), 'changelog.json');
}

export function getOKRPath(): string {
  return path.join(app.getPath('userData'), 'okr.json');
}
