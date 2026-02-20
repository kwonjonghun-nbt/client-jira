import type { ChangelogEntry, NormalizedIssue } from '../types/jira.types';
import { format, parseISO, startOfWeek, endOfWeek, compareAsc, compareDesc, differenceInCalendarDays } from 'date-fns';
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

export function getWeekRange(now?: Date): [Date, Date] {
  const ref = now ?? new Date();
  return [startOfWeek(ref, { weekStartsOn: 1 }), endOfWeek(ref, { weekStartsOn: 1 })];
}

export function formatDateISO(d: Date): string {
  return format(d, 'yyyy-MM-dd');
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
  todayFocus: NormalizedIssue[];
  dueThisWeek: NormalizedIssue[];
  workload: { name: string; count: number }[];
  maxWorkload: number;
  recentlyUpdated: NormalizedIssue[];
  typeDistribution: { type: string; count: number }[];
}

const PRIORITY_WEIGHT: Record<string, number> = {
  Highest: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Lowest: 4,
};

/** priority 문자열을 정렬 가중치로 변환. 값이 작을수록 높은 우선순위. */
export function getPriorityWeight(priority: string | null): number {
  if (priority == null) return 5;
  return PRIORITY_WEIGHT[priority] ?? 5;
}

/** 마감 임박(D-0~D-1) + 진행중 여부 판별 */
function isDueUrgent(issue: NormalizedIssue, today: Date): boolean {
  if (!issue.dueDate || issue.statusCategory !== 'indeterminate') return false;
  const daysLeft = differenceInCalendarDays(parseISO(issue.dueDate), today);
  return daysLeft >= 0 && daysLeft <= 1;
}

/** 리뷰중 상태 여부 판별 */
function isInReview(issue: NormalizedIssue): boolean {
  return issue.status.toLowerCase().includes('review');
}

/** 오늘 집중 처리해야 할 업무 목록 생성. 순수 함수. */
export function computeTodayFocus(issues: NormalizedIssue[], today?: Date, limit = 10): NormalizedIssue[] {
  const now = today ?? new Date();
  const incomplete = issues.filter((i) => i.statusCategory === 'indeterminate');

  return [...incomplete]
    .sort((a, b) => {
      // 1순위: priority 심각도
      const pw = getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
      if (pw !== 0) return pw;

      // 2순위: 마감 임박 + 진행중
      const aUrgent = isDueUrgent(a, now) ? 0 : 1;
      const bUrgent = isDueUrgent(b, now) ? 0 : 1;
      if (aUrgent !== bUrgent) return aUrgent - bUrgent;

      // 3순위: 리뷰중
      const aReview = isInReview(a) ? 0 : 1;
      const bReview = isInReview(b) ? 0 : 1;
      if (aReview !== bReview) return aReview - bReview;

      // 4: dueDate 가까운 순 (없으면 뒤로)
      if (a.dueDate && b.dueDate) {
        const dueCmp = compareAsc(parseISO(a.dueDate), parseISO(b.dueDate));
        if (dueCmp !== 0) return dueCmp;
      } else if (a.dueDate) {
        return -1;
      } else if (b.dueDate) {
        return 1;
      }

      // 5: updated 최신 순
      return compareDesc(parseISO(a.updated), parseISO(b.updated));
    })
    .slice(0, limit);
}

/** Compute all dashboard stats from filtered issues. Pure function. Single-pass accumulation. */
export function computeDashboardStats(filteredIssues: NormalizedIssue[], now?: Date): DashboardStats {
  const totalCount = filteredIssues.length;
  let inProgressCount = 0;
  let doneCount = 0;
  let newCount = 0;

  const [weekStart, weekEnd] = getWeekRange(now);
  const weekStartMs = weekStart.getTime();
  const weekEndMs = weekEnd.getTime();
  const dueThisWeekRaw: NormalizedIssue[] = [];

  const workloadMap = new Map<string, number>();
  const typeMap = new Map<string, number>();

  // Single pass: accumulate status counts, due-this-week, workload, type distribution
  for (const issue of filteredIssues) {
    // Status counts
    switch (issue.statusCategory) {
      case 'indeterminate': inProgressCount++; break;
      case 'done': doneCount++; break;
      case 'new': newCount++; break;
    }

    // Due this week
    if (issue.dueDate) {
      const dueMs = new Date(issue.dueDate).getTime();
      if (dueMs >= weekStartMs && dueMs <= weekEndMs) {
        dueThisWeekRaw.push(issue);
      }
    }

    // Workload (exclude done)
    if (issue.statusCategory !== 'done') {
      const name = issue.assignee || '(미할당)';
      workloadMap.set(name, (workloadMap.get(name) ?? 0) + 1);
    }

    // Type distribution
    const type = normalizeType(issue.issueType);
    typeMap.set(type, (typeMap.get(type) ?? 0) + 1);
  }

  const dueThisWeek = dueThisWeekRaw
    .sort((a, b) => compareAsc(parseISO(a.dueDate!), parseISO(b.dueDate!)))
    .slice(0, 10);

  const workload = [...workloadMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxWorkload = Math.max(...workload.map((w) => w.count), 1);

  const recentlyUpdated = [...filteredIssues]
    .sort((a, b) => compareDesc(parseISO(a.updated), parseISO(b.updated)))
    .slice(0, 8);

  const typeDistribution = [...typeMap.entries()].map(([type, count]) => ({ type, count }));

  const todayFocus = computeTodayFocus(filteredIssues, now);

  return {
    totalCount,
    inProgressCount,
    doneCount,
    newCount,
    todayFocus,
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
