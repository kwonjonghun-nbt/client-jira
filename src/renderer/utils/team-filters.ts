import type { NormalizedIssue, StoredData } from '../types/jira.types';
import type { Team } from '../types/settings.types';

/**
 * 팀의 assignees로 이슈를 필터링합니다.
 * team이 null이면 전체 이슈를 반환합니다 ("전체" 모드).
 */
export function filterIssuesByTeam(
  issues: NormalizedIssue[],
  team: Team | null,
): NormalizedIssue[] {
  if (!team) return issues;
  if (team.assignees.length === 0) return issues;

  const assigneeSet = new Set(team.assignees);
  return issues.filter((issue) =>
    (issue.assignee && assigneeSet.has(issue.assignee)) ||
    (issue.assigneeEmail && assigneeSet.has(issue.assigneeEmail)),
  );
}

/**
 * StoredData에 팀 필터를 적용한 새 StoredData를 반환합니다.
 */
export function filterStoredDataByTeam(
  data: StoredData,
  team: Team | null,
): StoredData {
  if (!team) return data;

  const filtered = filterIssuesByTeam(data.issues, team);
  return {
    ...data,
    issues: filtered,
    totalCount: filtered.length,
  };
}
