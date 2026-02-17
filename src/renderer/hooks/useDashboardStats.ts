import { useMemo, useState } from 'react';
import type { NormalizedIssue } from '../types/jira.types';
import { normalizeType } from '../utils/issue';
import { getWeekRange, formatDateISO } from '../utils/dashboard';

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

    let result = issues;

    // 담당자 필터
    if (assigneeFilter !== '전체') {
      result = result.filter((i) => i.assignee === assigneeFilter);
    }

    // 날짜 필터
    if (dateStart || dateEnd) {
      const startMs = dateStart ? new Date(dateStart).getTime() : 0;
      const endMs = dateEnd ? new Date(dateEnd + 'T23:59:59').getTime() : Infinity;

      result = result.filter((issue) => {
        const createdMs = new Date(issue.created).getTime();
        const dueMs = issue.dueDate ? new Date(issue.dueDate).getTime() : null;
        const createdInRange = createdMs >= startMs && createdMs <= endMs;
        const dueInRange = dueMs !== null && dueMs >= startMs && dueMs <= endMs;
        const spansRange = dueMs !== null && createdMs <= startMs && dueMs >= endMs;
        return createdInRange || dueInRange || spansRange;
      });
    }

    return result;
  }, [issues, dateStart, dateEnd, assigneeFilter]);

  const stats = useMemo(() => {
    if (!issues) return null;

    const totalCount = filteredIssues.length;
    const inProgressCount = filteredIssues.filter((i) => i.statusCategory === 'indeterminate').length;
    const doneCount = filteredIssues.filter((i) => i.statusCategory === 'done').length;
    const newCount = filteredIssues.filter((i) => i.statusCategory === 'new').length;

    const [weekStart, weekEnd] = getWeekRange();
    const dueThisWeek = filteredIssues
      .filter((i) => {
        if (!i.dueDate) return false;
        const due = new Date(i.dueDate);
        return due >= weekStart && due <= weekEnd;
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 10);

    const workloadMap = new Map<string, number>();
    filteredIssues
      .filter((i) => i.statusCategory !== 'done')
      .forEach((i) => {
        const assignee = i.assignee || '(미할당)';
        workloadMap.set(assignee, (workloadMap.get(assignee) || 0) + 1);
      });
    const workload = Array.from(workloadMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    const maxWorkload = Math.max(...workload.map((w) => w.count), 1);

    const recentlyUpdated = [...filteredIssues]
      .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
      .slice(0, 8);

    const typeMap = new Map<string, number>();
    filteredIssues.forEach((i) => {
      const normalized = normalizeType(i.issueType);
      typeMap.set(normalized, (typeMap.get(normalized) || 0) + 1);
    });
    const typeDistribution = Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    return {
      totalCount,
      inProgressCount,
      doneCount,
      newCount,
      dueThisWeek,
      workload,
      maxWorkload,
      recentlyUpdated,
      typeDistribution,
    };
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
