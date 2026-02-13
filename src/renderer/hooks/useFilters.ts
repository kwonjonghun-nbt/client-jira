import { useMemo } from 'react';
import type { NormalizedIssue } from '../types/jira.types';
import { useUIStore } from '../store/uiStore';
import { applyFilters, extractFilterOptions } from '../utils/issue-filters';

export function useFilters(issues: NormalizedIssue[]) {
  const filters = useUIStore((s) => s.filters);
  const setFilter = useUIStore((s) => s.setFilter);
  const toggleStatus = useUIStore((s) => s.toggleStatus);
  const clearFilters = useUIStore((s) => s.clearFilters);

  const filteredIssues = useMemo(() => applyFilters(issues, filters), [issues, filters]);
  const filterOptions = useMemo(() => extractFilterOptions(issues), [issues]);

  return { filters, setFilter, toggleStatus, clearFilters, filteredIssues, filterOptions };
}
