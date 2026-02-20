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

export interface DMReminderSchedule {
  time: string;
  message: string;
}

export interface DMUserMapping {
  assignee: string;
  slackUserId: string;
  enabled: boolean;
}

export interface DMReminderSettings {
  enabled: boolean;
  schedules: DMReminderSchedule[];
  userMappings: DMUserMapping[];
}

export interface SlackSettings {
  enabled: boolean;
  webhookUrl: string;
  dailyReportTime: string;
  replyToThread: boolean;
  botToken: string;
  channelId: string;
  threadSearchText: string;
  dmReminder: DMReminderSettings;
}

export interface EmailSettings {
  enabled: boolean;
  senderEmail: string;
  clientId: string;
  clientSecret: string;
}

export interface Settings {
  jira: JiraConnection;
  collection: Collection;
  schedule: Schedule;
  storage: StorageSettings;
  slack: SlackSettings;
  email: EmailSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  jira: { baseUrl: '', email: '' },
  collection: { projects: [], assignees: [], customJql: '' },
  schedule: { enabled: true, times: ['09:00', '13:00', '18:00'] },
  storage: { retentionDays: 90 },
  slack: { enabled: false, webhookUrl: '', dailyReportTime: '11:20', replyToThread: false, botToken: '', channelId: '', threadSearchText: '', dmReminder: { enabled: false, schedules: [{ time: '10:30', message: '오늘의 지라 업무를 최신화 하셨나요?' }, { time: '15:00', message: '계획하신 업무 일정에 변경사항이나 이슈로 인한 일정 변동은 없나요?' }, { time: '18:30', message: '오늘 업무내용을 정리해보세요.' }], userMappings: [] } },
  email: { enabled: false, senderEmail: '', clientId: '', clientSecret: '' },
};
