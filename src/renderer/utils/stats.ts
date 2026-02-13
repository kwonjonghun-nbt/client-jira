import type { NormalizedIssue } from '../types/jira.types';

export interface LabelStat {
  label: string;
  total: number;
  completed: number;
  incomplete: number;
  rate: number;
}

export interface LabelStatsSummary {
  labelCount: number;
  totalIssues: number;
  totalCompleted: number;
}

/** Compute label-based statistics from filtered issues within a date range. Pure function. */
export function computeLabelStats(
  filteredIssues: NormalizedIssue[],
  startDate: string,
  endDate: string,
): LabelStat[] {
  const startMs = startDate ? new Date(startDate).getTime() : 0;
  const endMs = endDate ? new Date(endDate + 'T23:59:59').getTime() : Infinity;

  const statsMap = new Map<string, { total: number; completed: number }>();

  for (const issue of filteredIssues) {
    const createdMs = new Date(issue.created).getTime();
    if (createdMs < startMs || createdMs > endMs) continue;

    const labels = issue.labels.length > 0 ? issue.labels : ['(없음)'];
    const isDone = issue.statusCategory === 'done';
    const updatedMs = new Date(issue.updated).getTime();
    const isCompletedInRange = isDone && updatedMs >= startMs && updatedMs <= endMs;

    for (const label of labels) {
      const existing = statsMap.get(label) ?? { total: 0, completed: 0 };
      existing.total += 1;
      if (isCompletedInRange) existing.completed += 1;
      statsMap.set(label, existing);
    }
  }

  const result: LabelStat[] = [];
  for (const [label, stat] of statsMap) {
    result.push({
      label,
      total: stat.total,
      completed: stat.completed,
      incomplete: stat.total - stat.completed,
      rate: stat.total > 0 ? (stat.completed / stat.total) * 100 : 0,
    });
  }

  result.sort((a, b) => b.total - a.total);
  return result;
}

/** Compute summary from label stats. Pure function. */
export function computeLabelStatsSummary(labelStats: LabelStat[]): LabelStatsSummary {
  let totalIssues = 0;
  let totalCompleted = 0;
  for (const s of labelStats) {
    totalIssues += s.total;
    totalCompleted += s.completed;
  }
  return { labelCount: labelStats.length, totalIssues, totalCompleted };
}
