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

// --- OKR ---

export const OKRObjectiveSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number(),
});

export const OKRKeyResultSchema = z.object({
  id: z.string(),
  objectiveId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number(),
});

export const VirtualTicketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  issueType: z.string(),
  assignee: z.string().optional(),
  createdAt: z.string(),
});

const OKRLinkBaseSchema = z.object({
  id: z.string(),
  keyResultId: z.string(),
  groupId: z.string().optional(),
  order: z.number(),
  x: z.number().optional(),
  y: z.number().optional(),
});

const OKRJiraLinkSchema = OKRLinkBaseSchema.extend({
  type: z.literal('jira'),
  issueKey: z.string(),
  virtualTicketId: z.string().optional(), // 하위호환: 기존 데이터에 이 필드가 있을 수 있음
});

const OKRVirtualLinkSchema = OKRLinkBaseSchema.extend({
  type: z.literal('virtual'),
  virtualTicketId: z.string(),
  issueKey: z.string().optional(), // 하위호환
});

export const OKRLinkSchema = z.discriminatedUnion('type', [OKRJiraLinkSchema, OKRVirtualLinkSchema]);

export const OKRGroupSchema = z.object({
  id: z.string(),
  keyResultId: z.string(),
  parentGroupId: z.string().optional(),
  title: z.string(),
  order: z.number(),
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
});

export const OKRRelationSchema = z.object({
  id: z.string(),
  fromType: z.enum(['link', 'group']),
  fromId: z.string(),
  fromAnchor: z.enum(['top', 'bottom', 'left', 'right']),
  toType: z.enum(['link', 'group']),
  toId: z.string(),
  toAnchor: z.enum(['top', 'bottom', 'left', 'right']),
  waypoints: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  label: z.string().optional(),
  // Migration compatibility: old format fields
  fromLinkId: z.string().optional(),
  toLinkId: z.string().optional(),
});

export const OKRDataSchema = z.object({
  objectives: z.array(OKRObjectiveSchema),
  keyResults: z.array(OKRKeyResultSchema),
  virtualTickets: z.array(VirtualTicketSchema),
  links: z.array(OKRLinkSchema),
  groups: z.array(OKRGroupSchema).default([]),
  relations: z.array(OKRRelationSchema).default([]),
  updatedAt: z.string(),
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
export type OKRObjective = z.infer<typeof OKRObjectiveSchema>;
export type OKRKeyResult = z.infer<typeof OKRKeyResultSchema>;
export type VirtualTicket = z.infer<typeof VirtualTicketSchema>;
export type OKRLink = z.infer<typeof OKRLinkSchema>;
export type OKRJiraLink = z.infer<typeof OKRJiraLinkSchema>;
export type OKRVirtualLink = z.infer<typeof OKRVirtualLinkSchema>;
export type OKRGroup = z.infer<typeof OKRGroupSchema>;
export type OKRRelation = z.infer<typeof OKRRelationSchema>;
export type OKRData = z.infer<typeof OKRDataSchema>;
