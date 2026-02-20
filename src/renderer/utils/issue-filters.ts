import type { NormalizedIssue } from '../types/jira.types';

export interface Filters {
  project: string;
  statuses: string[];
  assignee: string;
  search: string;
}

export interface FilterOptions {
  projects: string[];
  statuses: string[];
  assignees: string[];
}

/**
 * Apply filters to a list of issues. Single-pass combined predicate.
 * Pure function - no side effects.
 */
export function applyFilters(issues: NormalizedIssue[], filters: Filters): NormalizedIssue[] {
  const hasProject = !!filters.project;
  const hasStatuses = filters.statuses.length > 0;
  const statusSet = hasStatuses ? new Set(filters.statuses) : null;
  const hasAssignee = !!filters.assignee;
  const hasSearch = !!filters.search;
  const searchLower = hasSearch ? filters.search.toLowerCase() : '';
  const projectPrefix = hasProject ? filters.project + '-' : '';

  return issues.filter((issue) => {
    if (hasProject && !issue.key.startsWith(projectPrefix)) return false;
    if (statusSet && !statusSet.has(issue.status)) return false;
    if (hasAssignee && issue.assignee !== filters.assignee) return false;
    if (hasSearch && !issue.key.toLowerCase().includes(searchLower) && !issue.summary.toLowerCase().includes(searchLower)) return false;
    return true;
  });
}

/**
 * Extract unique filter options from a list of issues. Single-pass Set accumulation.
 * Pure function - no side effects.
 */
export function extractFilterOptions(issues: NormalizedIssue[]): FilterOptions {
  const projectSet = new Set<string>();
  const statusSet = new Set<string>();
  const assigneeSet = new Set<string>();

  for (const i of issues) {
    projectSet.add(i.key.split('-')[0]);
    statusSet.add(i.status);
    if (i.assignee != null) assigneeSet.add(i.assignee);
  }

  return {
    projects: [...projectSet].sort(),
    statuses: [...statusSet].sort(),
    assignees: [...assigneeSet].sort(),
  };
}
