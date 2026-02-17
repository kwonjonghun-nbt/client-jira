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
  startDate: string | null;
  dueDate: string | null;
  resolution: string | null;
  timeTracking: {
    originalEstimate?: string;
    remainingEstimate?: string;
    timeSpent?: string;
  } | null;
  parent: string | null;
  subtasks: string[];
  issueLinks: {
    type: string;
    direction: 'inward' | 'outward';
    linkedIssueKey: string;
  }[];
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

export interface ChangelogEntry {
  issueKey: string;
  summary: string;
  changeType: 'created' | 'status' | 'assignee' | 'priority' | 'storyPoints' | 'resolved';
  oldValue: string | null;
  newValue: string | null;
  detectedAt: string;
}

export interface ChangelogData {
  syncedAt: string;
  entries: ChangelogEntry[];
}

export interface OKRObjective {
  id: string;
  title: string;
  description?: string;
  order: number;
}

export interface OKRKeyResult {
  id: string;
  objectiveId: string;
  title: string;
  description?: string;
  order: number;
}

export interface VirtualTicket {
  id: string;
  title: string;
  description?: string;
  issueType: string;
  assignee?: string;
  createdAt: string;
}

export interface OKRLink {
  id: string;
  keyResultId: string;
  type: 'jira' | 'virtual';
  issueKey?: string;
  virtualTicketId?: string;
  groupId?: string;
  order: number;
  x?: number;
  y?: number;
}

export interface OKRGroup {
  id: string;
  keyResultId: string;
  parentGroupId?: string;
  title: string;
  order: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export type AnchorPosition = 'top' | 'bottom' | 'left' | 'right';
export type ConnectionEndpointType = 'link' | 'group';

export interface OKRRelation {
  id: string;
  fromType: ConnectionEndpointType;
  fromId: string;
  fromAnchor: AnchorPosition;
  toType: ConnectionEndpointType;
  toId: string;
  toAnchor: AnchorPosition;
  waypoints?: { x: number; y: number }[];
  label?: string;
}

export interface OKRData {
  objectives: OKRObjective[];
  keyResults: OKRKeyResult[];
  virtualTickets: VirtualTicket[];
  links: OKRLink[];
  groups: OKRGroup[];
  relations: OKRRelation[];
  updatedAt: string;
}

// ─── Status Transition Analysis ──────────────────────────────────────────────

export interface JiraChangelogItem {
  field: string;
  fromString: string | null;
  toString: string | null;
}

export interface JiraChangelogHistory {
  created: string;
  items: JiraChangelogItem[];
}

export interface StatusTransition {
  fromStatus: string | null;
  toStatus: string;
  transitionedAt: string;
  durationMs: number | null;
}

export interface StatusTransitionAnalysis {
  transitions: StatusTransition[];
  currentStatus: string;
  bottleneck: { fromStatus: string | null; toStatus: string; durationMs: number } | null;
  totalDurationMs: number;
}

export interface IssueTransitionSummary {
  issueKey: string;
  currentStatus: string;
  transitions: {
    from: string | null;
    to: string;
    at: string;
    durationMs: number | null;
  }[];
  bottleneck: { fromStatus: string | null; toStatus: string; durationMs: number } | null;
  totalDurationMs: number;
  flags: string[];
}
