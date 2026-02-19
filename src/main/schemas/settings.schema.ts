import { z } from 'zod';

export const JiraConnectionSchema = z.object({
  baseUrl: z.string(),
  email: z.string(),
});

export const ScheduleSchema = z.object({
  enabled: z.boolean().default(true),
  times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).default(['09:00', '13:00', '18:00']),
});

export const StorageSettingsSchema = z.object({
  retentionDays: z.number().min(1).max(365).default(90),
});

export const CollectionSchema = z.object({
  projects: z.array(z.string()).default([]),
  assignees: z.array(z.string()).default([]),
  customJql: z.string().default(''),
});

export const SlackSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  webhookUrl: z.string().default(''),
  dailyReportTime: z.string().regex(/^\d{2}:\d{2}$/).default('11:20'),
});

export const SettingsSchema = z.object({
  jira: JiraConnectionSchema,
  collection: CollectionSchema,
  schedule: ScheduleSchema,
  storage: StorageSettingsSchema,
  slack: SlackSettingsSchema.default({ enabled: false, webhookUrl: '', dailyReportTime: '11:20' }),
});

// Type exports
export type JiraConnection = z.infer<typeof JiraConnectionSchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type StorageSettings = z.infer<typeof StorageSettingsSchema>;
export type Collection = z.infer<typeof CollectionSchema>;
export type SlackSettings = z.infer<typeof SlackSettingsSchema>;
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  jira: {
    baseUrl: '',
    email: '',
  },
  collection: {
    projects: [],
    assignees: [],
    customJql: '',
  },
  schedule: {
    enabled: true,
    times: ['09:00', '13:00', '18:00'],
  },
  storage: {
    retentionDays: 90,
  },
  slack: {
    enabled: false,
    webhookUrl: '',
    dailyReportTime: '11:20',
  },
};
