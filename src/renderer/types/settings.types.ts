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
  Settings,
} from '../../shared/types';

export { DEFAULT_SETTINGS } from '../../shared/types';
