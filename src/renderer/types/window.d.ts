import type { NormalizedIssue, StoredData, MetaData, SyncStatus, SyncProgress, SyncResult, JiraProject } from './jira.types';
import type { Settings } from './settings.types';

export interface ElectronAPI {
  jira: {
    testConnection: (params: {
      url: string;
      email: string;
      token: string;
    }) => Promise<{ success: boolean; displayName?: string; error?: string }>;
    getProjects: () => Promise<JiraProject[]>;
  };
  settings: {
    load: () => Promise<Settings | null>;
    save: (settings: Settings) => Promise<void>;
    saveToken: (token: string) => Promise<void>;
    getToken: () => Promise<string | null>;
  };
  storage: {
    getLatest: () => Promise<StoredData | null>;
    getMeta: () => Promise<MetaData>;
  };
  sync: {
    trigger: () => Promise<SyncResult>;
    getStatus: () => Promise<SyncStatus>;
    onProgress: (callback: (progress: SyncProgress) => void) => () => void;
    onComplete: (callback: () => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
