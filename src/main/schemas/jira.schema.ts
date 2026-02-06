import { z } from 'zod';

// Jira API v3 응답 스키마

export const JiraUserSchema = z.object({
  displayName: z.string(),
  emailAddress: z.string().optional(),
  accountId: z.string().optional(),
});

export const JiraStatusCategorySchema = z.object({
  key: z.string(),
  name: z.string(),
});

export const JiraStatusSchema = z.object({
  name: z.string(),
  statusCategory: JiraStatusCategorySchema,
});

export const JiraPrioritySchema = z.object({
  name: z.string(),
  id: z.string().optional(),
});

export const JiraIssueTypeSchema = z.object({
  name: z.string(),
  subtask: z.boolean().optional(),
});

export const JiraSprintSchema = z.object({
  id: z.number(),
  name: z.string(),
  state: z.string().optional(),
});

export const JiraTimeTrackingSchema = z.object({
  originalEstimate: z.string().optional(),
  remainingEstimate: z.string().optional(),
  timeSpent: z.string().optional(),
  originalEstimateSeconds: z.number().optional(),
  remainingEstimateSeconds: z.number().optional(),
  timeSpentSeconds: z.number().optional(),
});

export const JiraIssueFieldsSchema = z.object({
  summary: z.string(),
  status: JiraStatusSchema,
  assignee: JiraUserSchema.nullable(),
  reporter: JiraUserSchema.nullable().optional(),
  priority: JiraPrioritySchema.nullable(),
  issuetype: JiraIssueTypeSchema,
  created: z.string(),
  updated: z.string(),
  duedate: z.string().nullable(),
  labels: z.array(z.string()).optional(),
  components: z.array(z.object({ name: z.string() })).optional(),
  // Story Points (커스텀 필드 - 인스턴스마다 다를 수 있음)
  customfield_10016: z.number().nullable().optional(),
  // Sprint (커스텀 필드)
  customfield_10020: z.array(JiraSprintSchema).nullable().optional(),
  // Time tracking
  timetracking: JiraTimeTrackingSchema.optional(),
  // Parent issue
  parent: z
    .object({
      key: z.string(),
      fields: z.object({ summary: z.string() }).optional(),
    })
    .optional(),
  // Subtasks
  subtasks: z
    .array(
      z.object({
        key: z.string(),
        fields: z.object({ summary: z.string() }).optional(),
      }),
    )
    .optional(),
  // Resolution
  resolution: z.object({ name: z.string() }).nullable().optional(),
});

export const JiraIssueSchema = z.object({
  key: z.string(),
  id: z.string().optional(),
  fields: JiraIssueFieldsSchema,
});

export const JiraSearchResponseSchema = z.object({
  startAt: z.number().optional(),
  maxResults: z.number().optional(),
  total: z.number().optional(),
  nextPageToken: z.string().optional(),
  issues: z.array(JiraIssueSchema),
});

export const JiraProjectSchema = z.object({
  key: z.string(),
  name: z.string(),
  id: z.string().optional(),
});

// Type exports
export type JiraUser = z.infer<typeof JiraUserSchema>;
export type JiraIssue = z.infer<typeof JiraIssueSchema>;
export type JiraIssueFields = z.infer<typeof JiraIssueFieldsSchema>;
export type JiraSearchResponse = z.infer<typeof JiraSearchResponseSchema>;
export type JiraProject = z.infer<typeof JiraProjectSchema>;
export type JiraSprint = z.infer<typeof JiraSprintSchema>;
