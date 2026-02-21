/**
 * 공유 테스트 픽스처 — 모든 테스트 파일에서 import하여 사용
 */
import type { NormalizedIssue } from '../src/main/schemas/storage.schema';
import type { JiraIssue } from '../src/main/schemas/jira.schema';

// ─── NormalizedIssue factory ─────────────────────────────────────────────────

export function makeIssue(overrides: Partial<NormalizedIssue> & { key: string }): NormalizedIssue {
  return {
    summary: 'Test issue',
    description: null,
    status: 'To Do',
    statusCategory: 'new',
    assignee: null,
    reporter: null,
    priority: 'Medium',
    issueType: 'Task',
    storyPoints: null,
    sprint: null,
    labels: [],
    components: [],
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z',
    startDate: null,
    dueDate: null,
    resolution: null,
    timeTracking: null,
    parent: null,
    subtasks: [],
    issueLinks: [],
    ...overrides,
  };
}

// ─── JiraIssue (raw API) factory ─────────────────────────────────────────────

export function makeJiraIssue(overrides?: Partial<JiraIssue>): JiraIssue {
  return {
    key: 'PROJ-1',
    id: '10001',
    self: 'https://jira.example.com/rest/api/3/issue/10001',
    fields: {
      summary: 'Test summary',
      description: null,
      status: { name: 'To Do', statusCategory: { key: 'new', name: 'To Do' } },
      assignee: null,
      reporter: null,
      priority: { name: 'Medium' },
      issuetype: { name: 'Task' },
      customfield_10016: null,
      customfield_10020: null,
      labels: [],
      components: [],
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
      duedate: null,
      resolution: null,
      timetracking: null,
      parent: null,
      subtasks: [],
      issuelinks: [],
    },
    ...overrides,
  } as JiraIssue;
}

// ─── Issue Map factory ───────────────────────────────────────────────────────

export function makeIssueMap(issues: NormalizedIssue[]): Map<string, NormalizedIssue> {
  const map = new Map<string, NormalizedIssue>();
  for (const issue of issues) {
    map.set(issue.key, issue);
  }
  return map;
}

// ─── Common test dates ───────────────────────────────────────────────────────

export const DETECTED_AT = '2025-01-15T10:00:00Z';
export const FIXED_NOW = new Date('2025-06-15T12:00:00Z');
