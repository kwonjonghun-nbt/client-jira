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

export const DMReminderScheduleSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/),
  message: z.string(),
});

export const DMUserMappingSchema = z.object({
  assignee: z.string(),
  slackUserId: z.string(),
  enabled: z.boolean().default(true),
});

export const DMReminderSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  schedules: z.array(DMReminderScheduleSchema).default([
    { time: '10:30', message: '오늘의 지라 업무를 최신화 하셨나요?' },
    { time: '15:00', message: '계획하신 업무 일정에 변경사항이나 이슈로 인한 일정 변동은 없나요?' },
    { time: '18:30', message: '오늘 업무내용을 정리해보세요.' },
  ]),
  userMappings: z.array(DMUserMappingSchema).default([]),
});

export const SlackSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  webhookUrl: z.string().default(''),
  dailyReportTime: z.string().regex(/^\d{2}:\d{2}$/).default('11:20'),
  replyToThread: z.boolean().default(false),
  botToken: z.string().default(''),
  channelId: z.string().default(''),
  threadSearchText: z.string().default(''),
  dmReminder: DMReminderSettingsSchema.default({
    enabled: false,
    schedules: [
      { time: '10:30', message: '오늘의 지라 업무를 최신화 하셨나요?' },
      { time: '15:00', message: '계획하신 업무 일정에 변경사항이나 이슈로 인한 일정 변동은 없나요?' },
      { time: '18:30', message: '오늘 업무내용을 정리해보세요.' },
    ],
    userMappings: [],
  }),
});

export const EmailSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  senderEmail: z.string().default(''),
  clientId: z.string().default(''),
  clientSecret: z.string().default(''),
});

export const SettingsSchema = z.object({
  jira: JiraConnectionSchema,
  collection: CollectionSchema,
  schedule: ScheduleSchema,
  storage: StorageSettingsSchema,
  slack: SlackSettingsSchema.default({ enabled: false, webhookUrl: '', dailyReportTime: '11:20', replyToThread: false, botToken: '', channelId: '', threadSearchText: '', dmReminder: { enabled: false, schedules: [{ time: '10:30', message: '오늘의 지라 업무를 최신화 하셨나요?' }, { time: '15:00', message: '계획하신 업무 일정에 변경사항이나 이슈로 인한 일정 변동은 없나요?' }, { time: '18:30', message: '오늘 업무내용을 정리해보세요.' }], userMappings: [] } }),
  email: EmailSettingsSchema.default({ enabled: false, senderEmail: '', clientId: '', clientSecret: '' }),
});

// Type exports
export type JiraConnection = z.infer<typeof JiraConnectionSchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type StorageSettings = z.infer<typeof StorageSettingsSchema>;
export type Collection = z.infer<typeof CollectionSchema>;
export type DMReminderSchedule = z.infer<typeof DMReminderScheduleSchema>;
export type DMUserMapping = z.infer<typeof DMUserMappingSchema>;
export type DMReminderSettings = z.infer<typeof DMReminderSettingsSchema>;
export type SlackSettings = z.infer<typeof SlackSettingsSchema>;
export type EmailSettings = z.infer<typeof EmailSettingsSchema>;
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
    replyToThread: false,
    botToken: '',
    channelId: '',
    threadSearchText: '',
    dmReminder: {
      enabled: false,
      schedules: [
        { time: '10:30', message: '오늘의 지라 업무를 최신화 하셨나요?' },
        { time: '15:00', message: '계획하신 업무 일정에 변경사항이나 이슈로 인한 일정 변동은 없나요?' },
        { time: '18:30', message: '오늘 업무내용을 정리해보세요.' },
      ],
      userMappings: [],
    },
  },
  email: {
    enabled: false,
    senderEmail: '',
    clientId: '',
    clientSecret: '',
  },
};
