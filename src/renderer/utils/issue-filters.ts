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
 * Apply filters to a list of issues.
 * Pure function - no side effects.
 */
export function applyFilters(issues: NormalizedIssue[], filters: Filters): NormalizedIssue[] {
  let result = issues;

  if (filters.project) {
    result = result.filter((issue) => issue.key.startsWith(filters.project + '-'));
  }

  if (filters.statuses.length > 0) {
    result = result.filter((issue) => filters.statuses.includes(issue.status));
  }

  if (filters.assignee) {
    result = result.filter((issue) => issue.assignee === filters.assignee);
  }

  if (filters.search) {
    const search = filters.search.toLowerCase();
    result = result.filter(
      (issue) =>
        issue.key.toLowerCase().includes(search) ||
        issue.summary.toLowerCase().includes(search),
    );
  }

  return result;
}

/**
 * Extract unique filter options from a list of issues.
 * Pure function - no side effects.
 */
export function extractFilterOptions(issues: NormalizedIssue[]): FilterOptions {
  const projects = [...new Set(issues.map((i) => i.key.split('-')[0]))].sort();
  const statuses = [...new Set(issues.map((i) => i.status))].sort();
  const assignees = [...new Set(issues.map((i) => i.assignee).filter(Boolean) as string[])].sort();
  return { projects, statuses, assignees };
}
