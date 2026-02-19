// Renderer용 설정 타입 — Main의 settings.schema.ts와 동일 구조 유지
// Source of truth: src/main/schemas/settings.schema.ts

export interface JiraConnection {
  baseUrl: string;
  email: string;
}

export interface Schedule {
  enabled: boolean;
  times: string[];
}

export interface StorageSettings {
  retentionDays: number;
}

export interface Collection {
  projects: string[];
  assignees: string[];
  customJql: string;
}

export interface SlackSettings {
  enabled: boolean;
  webhookUrl: string;
  dailyReportTime: string;
}

export interface Settings {
  jira: JiraConnection;
  collection: Collection;
  schedule: Schedule;
  storage: StorageSettings;
  slack: SlackSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  jira: { baseUrl: '', email: '' },
  collection: { projects: [], assignees: [], customJql: '' },
  schedule: { enabled: true, times: ['09:00', '13:00', '18:00'] },
  storage: { retentionDays: 90 },
  slack: { enabled: false, webhookUrl: '', dailyReportTime: '11:20' },
};
