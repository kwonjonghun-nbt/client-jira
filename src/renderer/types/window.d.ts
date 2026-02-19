import type { NormalizedIssue, StoredData, MetaData, SyncStatus, SyncProgress, SyncResult, JiraProject, LabelNote, ReportMeta, ChangelogData, OKRData, JiraChangelogHistory } from './jira.types';
import type { Settings } from './settings.types';

export interface ElectronAPI {
  jira: {
    testConnection: (params: {
      url: string;
      email: string;
      token: string;
    }) => Promise<{ success: boolean; displayName?: string; error?: string }>;
    getProjects: () => Promise<JiraProject[]>;
    getIssueChangelog: (issueKey: string) => Promise<JiraChangelogHistory[]>;
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
    deleteReport: (filename: string) => Promise<void>;
    getChangelog: () => Promise<ChangelogData | null>;
    getOKR: () => Promise<OKRData | null>;
    saveOKR: (data: OKRData) => Promise<void>;
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
  updater: {
    checkForUpdates: () => Promise<void>;
    installAndRestart: () => Promise<void>;
    onUpdateAvailable: (callback: () => void) => () => void;
    onUpdateNotAvailable: (callback: () => void) => () => void;
    onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
    onError: (callback: (error: { message: string }) => void) => () => void;
  };
  ai: {
    run: (prompt: string, aiType?: string) => Promise<string>;
    abort: (id: string) => Promise<void>;
    onChunk: (callback: (id: string, text: string) => void) => () => void;
    onDone: (callback: (id: string, exitCode: number) => void) => () => void;
    onError: (callback: (id: string, message: string) => void) => () => void;
    notifyTaskCompleted: (params: { title: string; status: 'done' | 'error' }) => Promise<void>;
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
