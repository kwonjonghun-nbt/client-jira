import type { JiraIssue } from '../schemas/jira.schema';
import type { NormalizedIssue } from '../schemas/storage.schema';

/**
 * Jira API 응답의 이슈를 플랫한 구조로 정규화
 */
export function normalizeIssue(issue: JiraIssue): NormalizedIssue {
  const { fields } = issue;

  const sprints = fields.customfield_10020;
  const activeSprint = sprints?.find((s) => s.state === 'active') ?? sprints?.[0] ?? null;

  return {
    key: issue.key,
    summary: fields.summary,
    status: fields.status.name,
    statusCategory: fields.status.statusCategory.key,
    assignee: fields.assignee?.displayName ?? null,
    reporter: fields.reporter?.displayName ?? null,
    priority: fields.priority?.name ?? null,
    issueType: fields.issuetype.name,
    storyPoints: fields.customfield_10016 ?? null,
    sprint: activeSprint?.name ?? null,
    labels: fields.labels ?? [],
    components: fields.components?.map((c) => c.name) ?? [],
    created: fields.created,
    updated: fields.updated,
    dueDate: fields.duedate,
    resolution: fields.resolution?.name ?? null,
    timeTracking: fields.timetracking
      ? {
          originalEstimate: fields.timetracking.originalEstimate,
          remainingEstimate: fields.timetracking.remainingEstimate,
          timeSpent: fields.timetracking.timeSpent,
        }
      : null,
    parent: fields.parent?.key ?? null,
    subtasks: fields.subtasks?.map((s) => s.key) ?? [],
  };
}

/**
 * 여러 이슈를 일괄 정규화
 */
export function normalizeIssues(issues: JiraIssue[]): NormalizedIssue[] {
  return issues.map(normalizeIssue);
}
