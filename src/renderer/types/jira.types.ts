// Shared types — single source of truth: Main Zod schemas (src/main/schemas/storage.schema.ts)
export type {
  NormalizedIssue,
  StoredData,
  SyncHistoryEntry,
  MetaData,
  SyncStatus,
  SyncProgress,
  LabelNote,
  ChangelogEntry,
  ChangelogData,
  OKRObjective,
  OKRKeyResult,
  VirtualTicket,
  OKRLink,
  OKRJiraLink,
  OKRVirtualLink,
  OKRGroup,
  OKRRelation,
  OKRData,
} from '../../shared/types';

// ─── Renderer-only types (Main 스키마에 없음) ───────────────────────────────

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

export interface ReportMeta {
  filename: string;
  title: string;
  modifiedAt: string;
}

// ─── AI Canvas Changes ──────────────────────────────────────────────────────

export type AnchorPosition = 'top' | 'bottom' | 'left' | 'right';
export type ConnectionEndpointType = 'link' | 'group';

export interface CanvasChangeGroup {
  action: 'add' | 'update' | 'delete';
  id?: string;
  title?: string;
  parentGroupId?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface CanvasChangeLink {
  action: 'update';
  id: string;
  groupId?: string | null;
  x?: number;
  y?: number;
}

export interface CanvasChangeRelation {
  action: 'add' | 'delete';
  id?: string;
  fromId?: string;
  toId?: string;
  fromAnchor?: AnchorPosition;
  toAnchor?: AnchorPosition;
  label?: string;
}

export interface CanvasChangeVirtualTicket {
  action: 'add';
  title: string;
  issueType: string;
  assignee?: string;
  groupId?: string;
}

export interface CanvasChanges {
  groups?: CanvasChangeGroup[];
  links?: CanvasChangeLink[];
  relations?: CanvasChangeRelation[];
  virtualTickets?: CanvasChangeVirtualTicket[];
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
