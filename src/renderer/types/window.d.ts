import type { NormalizedIssue, StoredData, MetaData, SyncStatus, SyncProgress, SyncResult, JiraProject, LabelNote, ReportMeta } from './jira.types';
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
    getLabelNotes: () => Promise<LabelNote[]>;
    saveLabelNotes: (notes: LabelNote[]) => Promise<void>;
    listReports: () => Promise<ReportMeta[]>;
    getReport: (filename: string) => Promise<string | null>;
    saveReport: (filename: string, content: string) => Promise<void>;
  };
  sync: {
    trigger: () => Promise<SyncResult>;
    getStatus: () => Promise<SyncStatus>;
    onProgress: (callback: (progress: SyncProgress) => void) => () => void;
    onComplete: (callback: () => void) => () => void;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
