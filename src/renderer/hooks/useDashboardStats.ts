import { useMemo, useState } from 'react';
import type { NormalizedIssue } from '../types/jira.types';
import { formatDateISO, filterDashboardIssues, computeDashboardStats } from '../utils/dashboard';

export function useDashboardStats(issues: NormalizedIssue[] | undefined) {
  const [activePreset, setActivePreset] = useState(30);
  const [dateStart, setDateStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDateISO(d);
  });
  const [dateEnd, setDateEnd] = useState(() => formatDateISO(new Date()));
  const [assigneeFilter, setAssigneeFilter] = useState<string>('전체');

  const assignees = useMemo(() => {
    if (!issues) return [];
    return [...new Set(issues.map((i) => i.assignee).filter(Boolean) as string[])].sort();
  }, [issues]);

  const applyDatePreset = (days: number) => {
    setActivePreset(days);
    if (days === 0) {
      setDateStart('');
      setDateEnd('');
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      setDateStart(formatDateISO(start));
      setDateEnd(formatDateISO(end));
    }
  };

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    return filterDashboardIssues(issues, dateStart, dateEnd, assigneeFilter);
  }, [issues, dateStart, dateEnd, assigneeFilter]);

  const stats = useMemo(() => {
    if (!issues) return null;
    return computeDashboardStats(filteredIssues);
  }, [issues, filteredIssues]);

  return {
    filteredIssues,
    stats,
    dateStart,
    dateEnd,
    activePreset,
    applyDatePreset,
    setDateStart,
    setDateEnd,
    assigneeFilter,
    setAssigneeFilter,
    assignees,
  };
}
