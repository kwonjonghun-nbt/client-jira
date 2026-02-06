import { useMemo } from 'react';
import type { NormalizedIssue } from '../types/jira.types';
import { useUIStore } from '../store/uiStore';

export function useFilters(issues: NormalizedIssue[]) {
  const filters = useUIStore((s) => s.filters);
  const setFilter = useUIStore((s) => s.setFilter);
  const toggleStatus = useUIStore((s) => s.toggleStatus);
  const clearFilters = useUIStore((s) => s.clearFilters);

  const filteredIssues = useMemo(() => {
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
  }, [issues, filters]);

  const filterOptions = useMemo(() => {
    const projects = [...new Set(issues.map((i) => i.key.split('-')[0]))].sort();
    const statuses = [...new Set(issues.map((i) => i.status))].sort();
    const assignees = [...new Set(issues.map((i) => i.assignee).filter(Boolean) as string[])].sort();
    return { projects, statuses, assignees };
  }, [issues]);

  return { filters, setFilter, toggleStatus, clearFilters, filteredIssues, filterOptions };
}
