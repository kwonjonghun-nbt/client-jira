import type { NormalizedIssue, StoredData, MetaData, SyncStatus, SyncProgress, SyncResult, JiraProject, LabelNote, ReportMeta, ChangelogData } from './jira.types';
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
    getChangelog: () => Promise<ChangelogData | null>;
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
  terminal: {
    create: (aiType?: string, initialPrompt?: string, cols?: number, rows?: number) => Promise<string>;
    write: (id: string, data: string) => Promise<void>;
    resize: (id: string, cols: number, rows: number) => Promise<void>;
    close: (id: string) => Promise<void>;
    onData: (callback: (id: string, data: string) => void) => () => void;
    onExit: (callback: (id: string, exitCode: number) => void) => () => void;
};
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
