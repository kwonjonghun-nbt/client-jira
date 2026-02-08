import type { JiraIssue } from '../schemas/jira.schema';
import type { NormalizedIssue } from '../schemas/storage.schema';

/** ADF(Atlassian Document Format) JSON → 플레인 텍스트 */
function extractTextFromAdf(adf: unknown): string | null {
  if (!adf || typeof adf !== 'object') return null;
  const doc = adf as Record<string, unknown>;
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) return null;

  const texts: string[] = [];
  function walk(nodes: unknown[]): void {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const n = node as Record<string, unknown>;
      if (n.type === 'text' && typeof n.text === 'string') {
        texts.push(n.text);
      }
      if (Array.isArray(n.content)) walk(n.content);
    }
  }
  walk(doc.content as unknown[]);
  const result = texts.join('').trim();
  return result || null;
}

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
    description: extractTextFromAdf(fields.description),
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
    startDate: activeSprint?.startDate ?? null,
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
    issueLinks: (fields.issuelinks ?? []).map((link) => {
      const isOutward = !!link.outwardIssue;
      return {
        type: link.type.name,
        direction: isOutward ? 'outward' as const : 'inward' as const,
        linkedIssueKey: isOutward ? link.outwardIssue!.key : link.inwardIssue!.key,
      };
    }),
  };
}

/**
 * 여러 이슈를 일괄 정규화
 */
export function normalizeIssues(issues: JiraIssue[]): NormalizedIssue[] {
  return issues.map(normalizeIssue);
}
