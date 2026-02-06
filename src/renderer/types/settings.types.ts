// Renderer에서 사용하는 설정 타입

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

export interface Settings {
  jira: JiraConnection;
  collection: Collection;
  schedule: Schedule;
  storage: StorageSettings;
}
