// Shared types — Single source of truth for Main↔Renderer
// Main의 Zod 스키마에서 추론된 타입을 re-export

// Jira/동기화 타입 (Main 스키마 기반)
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
} from '../../main/schemas/storage.schema';

// Settings 타입 (Main 스키마 기반)
export type {
  JiraConnection,
  Schedule,
  StorageSettings,
  Collection,
  DMReminderSchedule,
  DMUserMapping,
  DMReminderSettings,
  SlackSettings,
  EmailSettings,
  Team,
  Settings,
} from '../../main/schemas/settings.schema';

export { DEFAULT_SETTINGS, TEAM_COLORS } from '../../main/schemas/settings.schema';
