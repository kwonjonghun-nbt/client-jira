import type { ChangelogEntry, NormalizedIssue } from '../types/jira.types';
import { normalizeType } from './issue';

export const DATE_PRESETS = [
  { label: '7일', days: 7 },
  { label: '30일', days: 30 },
  { label: '90일', days: 90 },
  { label: '전체', days: 0 },
];

export const changeTypeConfig: Record<ChangelogEntry['changeType'], { label: string; color: string }> = {
  created: { label: '신규 생성', color: 'bg-green-100 text-green-700' },
  status: { label: '상태 변경', color: 'bg-blue-100 text-blue-700' },
  assignee: { label: '담당자 변경', color: 'bg-purple-100 text-purple-700' },
  priority: { label: '우선순위 변경', color: 'bg-orange-100 text-orange-700' },
  storyPoints: { label: 'SP 변경', color: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: '해결됨', color: 'bg-emerald-100 text-emerald-700' },
};

export function getWeekRange(): [Date, Date] {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return [monday, sunday];
}

export function formatDateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatChangeValue(entry: ChangelogEntry): string {
  if (entry.changeType === 'created') return '신규 생성';
  if (entry.changeType === 'resolved') return `해결: ${entry.newValue}`;
  const old = entry.oldValue ?? '(없음)';
  const next = entry.newValue ?? '(없음)';
  return `${old} → ${next}`;
}

export interface DashboardStats {
  totalCount: number;
  inProgressCount: number;
  doneCount: number;
  newCount: number;
  dueThisWeek: NormalizedIssue[];
  workload: { name: string; count: number }[];
  maxWorkload: number;
  recentlyUpdated: NormalizedIssue[];
  typeDistribution: { type: string; count: number }[];
}

/** Compute all dashboard stats from filtered issues. Pure function. */
export function computeDashboardStats(filteredIssues: NormalizedIssue[]): DashboardStats {
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
}

/** Filter issues by date range and assignee. Pure function. */
export function filterDashboardIssues(
  issues: NormalizedIssue[],
  dateStart: string,
  dateEnd: string,
  assigneeFilter: string,
): NormalizedIssue[] {
  let result = issues;

  if (assigneeFilter !== '전체') {
    result = result.filter((i) => i.assignee === assigneeFilter);
  }

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
}
