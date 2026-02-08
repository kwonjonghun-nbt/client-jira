import { z } from 'zod';
import { JiraIssueSchema } from './jira.schema';

// 정규화된 이슈 데이터 (Jira API 응답을 플랫하게 변환)
export const NormalizedIssueSchema = z.object({
  key: z.string(),
  summary: z.string(),
  description: z.string().nullable().optional(),
  status: z.string(),
  statusCategory: z.string(),
  assignee: z.string().nullable(),
  reporter: z.string().nullable(),
  priority: z.string().nullable(),
  issueType: z.string(),
  storyPoints: z.number().nullable(),
  sprint: z.string().nullable(),
  labels: z.array(z.string()),
  components: z.array(z.string()),
  created: z.string(),
  updated: z.string(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  resolution: z.string().nullable(),
  timeTracking: z
    .object({
      originalEstimate: z.string().optional(),
      remainingEstimate: z.string().optional(),
      timeSpent: z.string().optional(),
    })
    .nullable(),
  parent: z.string().nullable(),
  subtasks: z.array(z.string()),
  issueLinks: z.array(
    z.object({
      type: z.string(),
      direction: z.enum(['inward', 'outward']),
      linkedIssueKey: z.string(),
    }),
  ),
});

export const StoredDataSchema = z.object({
  syncedAt: z.string(),
  source: z.object({
    baseUrl: z.string(),
    projects: z.array(z.string()),
  }),
  issues: z.array(NormalizedIssueSchema),
  totalCount: z.number(),
});

export const SyncHistoryEntrySchema = z.object({
  timestamp: z.string(),
  type: z.enum(['scheduled', 'manual']),
  issueCount: z.number(),
  duration: z.number(),
  success: z.boolean(),
  error: z.string().optional(),
});

export const MetaDataSchema = z.object({
  lastSync: z.string().nullable(),
  syncHistory: z.array(SyncHistoryEntrySchema),
});

export const SyncStatusSchema = z.object({
  isRunning: z.boolean(),
  lastSync: z.string().nullable(),
  lastResult: SyncHistoryEntrySchema.nullable(),
});

export const SyncProgressSchema = z.object({
  current: z.number(),
  total: z.number(),
  percentage: z.number(),
});

export const LabelNoteSchema = z.object({
  label: z.string(),
  description: z.string(),
  updatedAt: z.string(),
});

export const LabelNotesDataSchema = z.array(LabelNoteSchema);

export const ChangelogEntrySchema = z.object({
  issueKey: z.string(),
  summary: z.string(),
  changeType: z.enum(['created', 'status', 'assignee', 'priority', 'storyPoints', 'resolved']),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  detectedAt: z.string(),
});

export const ChangelogDataSchema = z.object({
  syncedAt: z.string(),
  entries: z.array(ChangelogEntrySchema),
});

// Type exports
export type NormalizedIssue = z.infer<typeof NormalizedIssueSchema>;
export type StoredData = z.infer<typeof StoredDataSchema>;
export type SyncHistoryEntry = z.infer<typeof SyncHistoryEntrySchema>;
export type MetaData = z.infer<typeof MetaDataSchema>;
export type SyncStatus = z.infer<typeof SyncStatusSchema>;
export type SyncProgress = z.infer<typeof SyncProgressSchema>;
export type LabelNote = z.infer<typeof LabelNoteSchema>;
export type ChangelogEntry = z.infer<typeof ChangelogEntrySchema>;
export type ChangelogData = z.infer<typeof ChangelogDataSchema>;
