import { convertADFToMarkdown } from 'adf-to-markdown';
import type { ADFDocument } from 'adf-to-markdown';
import type { JiraIssue } from '../schemas/jira.schema';
import type { NormalizedIssue } from '../schemas/storage.schema';

/** `${issueKey}:${updated}` → Markdown 변환 결과 캐시 */
const adfCache = new Map<string, string | null>();

/** @internal 테스트 전용 — 캐시 초기화 */
export function _clearAdfCacheForTesting(): void {
  adfCache.clear();
}

/** ADF(Atlassian Document Format) JSON → Markdown */
function adfToMarkdown(adf: unknown): string | null {
  if (!adf || typeof adf !== 'object') return null;
  const doc = adf as Record<string, unknown>;
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) return null;

  const result = convertADFToMarkdown(adf as ADFDocument).trim();
  return result || null;
}

/**
 * Jira API 응답의 이슈를 플랫한 구조로 정규화
 */
export function normalizeIssue(issue: JiraIssue): NormalizedIssue {
  const { fields } = issue;

  const sprints = fields.customfield_10020;
  const activeSprint = sprints?.find((s) => s.state === 'active') ?? sprints?.[0] ?? null;

  const cacheKey = `${issue.key}:${fields.updated}`;
  if (!adfCache.has(cacheKey)) {
    adfCache.set(cacheKey, adfToMarkdown(fields.description));
  }

  return {
    key: issue.key,
    summary: fields.summary,
    description: adfCache.get(cacheKey) ?? null,
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
 * 여러 이슈를 일괄 정규화 (배치 단위로 ADF 변환 캐시를 정리)
 */
export function normalizeIssues(issues: JiraIssue[]): NormalizedIssue[] {
  const result = issues.map(normalizeIssue);

  // 현재 배치에 없는 캐시 키 제거 (메모리 누수 방지)
  const activeKeys = new Set(issues.map((i) => `${i.key}:${i.fields.updated}`));
  for (const key of adfCache.keys()) {
    if (!activeKeys.has(key)) adfCache.delete(key);
  }

  return result;
}
