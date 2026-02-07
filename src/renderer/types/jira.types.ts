// Renderer에서 사용하는 Jira 타입 (main의 스키마에서 추출한 타입 미러링)

export interface NormalizedIssue {
  key: string;
  summary: string;
  description?: string | null;
  status: string;
  statusCategory: string;
  assignee: string | null;
  reporter: string | null;
  priority: string | null;
  issueType: string;
  storyPoints: number | null;
  sprint: string | null;
  labels: string[];
  components: string[];
  created: string;
  updated: string;
  dueDate: string | null;
  resolution: string | null;
  timeTracking: {
    originalEstimate?: string;
    remainingEstimate?: string;
    timeSpent?: string;
  } | null;
  parent: string | null;
  subtasks: string[];
}

export interface StoredData {
  syncedAt: string;
  source: {
    baseUrl: string;
    projects: string[];
  };
  issues: NormalizedIssue[];
  totalCount: number;
}

export interface SyncHistoryEntry {
  timestamp: string;
  type: 'scheduled' | 'manual';
  issueCount: number;
  duration: number;
  success: boolean;
  error?: string;
}

export interface MetaData {
  lastSync: string | null;
  syncHistory: SyncHistoryEntry[];
}

export interface SyncStatus {
  isRunning: boolean;
  lastSync: string | null;
  lastResult: SyncHistoryEntry | null;
}

export interface SyncProgress {
  current: number;
  total: number;
  percentage: number;
}

export interface JiraProject {
  key: string;
  name: string;
}

export interface SyncResult {
  success: boolean;
  issueCount: number;
  duration: number;
  error?: string;
}

export interface LabelNote {
  label: string;
  description: string;
  updatedAt: string;
}

export interface ReportMeta {
  filename: string;
  title: string;
  modifiedAt: string;
}
