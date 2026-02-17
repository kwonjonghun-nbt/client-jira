import { parseISO } from 'date-fns';
import type { ViewMode } from '../components/timeline/TimelineHeader';
import type { NormalizedIssue } from '../types/jira.types';

export const VIEW_MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'month', label: '월' },
  { value: 'week', label: '주' },
];

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 0.25;

/**
 * Filter issues by date range
 * An issue is included if its created or dueDate falls within the range,
 * or if the issue spans the entire selected range
 */
export function filterByDateRange(
  issues: NormalizedIssue[],
  dateStart: string,
  dateEnd: string
): NormalizedIssue[] {
  if (!dateStart && !dateEnd) return issues;
  const startMs = dateStart ? parseISO(dateStart).getTime() : 0;
  const endMs = dateEnd ? parseISO(dateEnd + 'T23:59:59').getTime() : Infinity;

  return issues.filter((issue) => {
    const createdMs = parseISO(issue.created).getTime();
    const dueMs = issue.dueDate ? parseISO(issue.dueDate).getTime() : null;
    // created가 기간 안에 있거나, dueDate가 기간 안에 있거나, 이슈 기간이 선택 기간을 감싸는 경우
    const createdInRange = createdMs >= startMs && createdMs <= endMs;
    const dueInRange = dueMs !== null && dueMs >= startMs && dueMs <= endMs;
    const spansRange = dueMs !== null && createdMs <= startMs && dueMs >= endMs;
    return createdInRange || dueInRange || spansRange;
  });
}

/**
 * Filter issues by hidden row types
 */
export function filterByRowTypes(
  issues: NormalizedIssue[],
  hiddenRowTypes: Set<string>
): NormalizedIssue[] {
  if (hiddenRowTypes.size === 0) return issues;
  return issues.filter((issue) => !hiddenRowTypes.has(issue.issueType.toLowerCase()));
}

/**
 * Extract unique issue type options from issues (deduplicated)
 */
export function extractIssueTypeOptions(
  issues: NormalizedIssue[]
): { value: string; label: string }[] {
  const types = new Map<string, string>();
  for (const issue of issues) {
    const key = issue.issueType.toLowerCase();
    if (!types.has(key)) types.set(key, issue.issueType);
  }
  return Array.from(types.entries()).map(([key, name]) => ({ value: key, label: name }));
}
