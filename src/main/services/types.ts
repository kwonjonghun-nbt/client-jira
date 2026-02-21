import type { BrowserWindow } from 'electron';
import type { AIRunnerService } from './ai-runner';
import type { CredentialsService } from './credentials';
import type { DailyReportScheduler } from './daily-report-scheduler';
import type { DMReminderScheduler } from './dm-reminder-scheduler';
import type { EmailService } from './email';
import type { JiraClient } from './jira-client';
import type { SchedulerService } from './scheduler';
import type { SlackService } from './slack';
import type { StorageService } from './storage';
import type { SyncService } from './sync';
import type { TerminalService } from './terminal';
import type { UpdaterService } from './updater';

export interface TeamSchedulers {
  dailyReport: DailyReportScheduler;
  dmReminder: DMReminderScheduler;
}

export interface AppServices {
  mainWindow: BrowserWindow | null;
  storage: StorageService | null;
  credentials: CredentialsService | null;
  jiraClient: JiraClient | null;
  sync: SyncService | null;
  scheduler: SchedulerService | null;
  terminal: TerminalService | null;
  aiRunner: AIRunnerService | null;
  updater: UpdaterService | null;
  slack: SlackService | null;
  dailyReportScheduler: DailyReportScheduler | null;
  dmReminderScheduler: DMReminderScheduler | null;
  email: EmailService | null;
  teamSchedulers: Map<string, TeamSchedulers>;
}
