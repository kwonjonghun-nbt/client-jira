import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { uniq } from 'es-toolkit';
import type { NormalizedIssue } from '../types/jira.types';
import { filterDashboardIssues, computeDashboardStats } from '../utils/dashboard';
import { computeDatePresetRange } from '../utils/date-presets';

export function useDashboardStats(issues: NormalizedIssue[] | undefined) {
  const [activePreset, setActivePreset] = useState(30);
  const [dateStart, setDateStart] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateEnd, setDateEnd] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [assigneeFilter, setAssigneeFilter] = useState<string>('전체');

  const assignees = useMemo(() => {
    if (!issues) return [];
    return uniq(issues.map((i) => i.assignee).filter((a): a is string => a != null)).sort();
  }, [issues]);

  const applyDatePreset = (days: number) => {
    setActivePreset(days);
    const { start, end } = computeDatePresetRange(days);
    setDateStart(start);
    setDateEnd(end);
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
