import { useMemo, useState } from 'react';
import type { NormalizedIssue } from '../types/jira.types';
import { DATE_PRESETS, formatDateISO } from '../utils/dashboard';
import { computeLabelStats, computeLabelStatsSummary } from '../utils/stats';

export type StatsViewMode = 'table' | 'chart';

export function useStatsPage(filteredIssues: NormalizedIssue[]) {
  const now = new Date();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return formatDateISO(d);
  });
  const [endDate, setEndDate] = useState(() => formatDateISO(now));
  const [viewMode, setViewMode] = useState<StatsViewMode>('table');

  const applyPreset = (days: number) => {
    if (days === 0) {
      setStartDate('');
      setEndDate('');
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      setStartDate(formatDateISO(start));
      setEndDate(formatDateISO(end));
    }
  };

  const labelStats = useMemo(
    () => computeLabelStats(filteredIssues, startDate, endDate),
    [filteredIssues, startDate, endDate],
  );

  const summary = useMemo(
    () => computeLabelStatsSummary(labelStats),
    [labelStats],
  );

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    viewMode,
    setViewMode,
    applyPreset,
    labelStats,
    summary,
  };
}
