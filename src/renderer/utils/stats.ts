import { format, parseISO, subDays } from 'date-fns';
import type { NormalizedIssue } from '../types/jira.types';
import { DATE_PRESETS } from './dashboard';

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
  const startMs = startDate ? parseISO(startDate).getTime() : 0;
  const endMs = endDate ? parseISO(endDate + 'T23:59:59').getTime() : Infinity;

  const statsMap = new Map<string, { total: number; completed: number }>();

  for (const issue of filteredIssues) {
    const createdMs = parseISO(issue.created).getTime();
    if (createdMs < startMs || createdMs > endMs) continue;

    const labels = issue.labels.length > 0 ? issue.labels : ['(없음)'];
    const isDone = issue.statusCategory === 'done';
    const updatedMs = parseISO(issue.updated).getTime();
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

/** Match current date range to a preset. Returns matching days value or null. Pure function. */
export function matchPresetDays(startDate: string, endDate: string, now?: Date): number | null {
  const ref = now ?? new Date();
  const today = format(ref, 'yyyy-MM-dd');
  for (const preset of DATE_PRESETS) {
    if (preset.days === 0) {
      if (!startDate && !endDate) return 0;
    } else {
      const expectedStart = format(subDays(ref, preset.days), 'yyyy-MM-dd');
      if (startDate === expectedStart && endDate === today) return preset.days;
    }
  }
  return null;
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
