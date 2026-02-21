// Re-export from shared types — single source of truth: Main Zod schemas
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
} from '../../shared/types';

export { DEFAULT_SETTINGS, TEAM_COLORS } from '../../shared/types';
