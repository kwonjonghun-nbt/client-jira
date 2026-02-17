import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import type { NormalizedIssue } from '../types/jira.types';
import { DATE_PRESETS, formatDateISO } from '../utils/dashboard';
import { computeLabelStats, computeLabelStatsSummary } from '../utils/stats';

export type StatsViewMode = 'table' | 'chart';

export function useStatsPage(filteredIssues: NormalizedIssue[]) {
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<StatsViewMode>('table');

  const applyPreset = (days: number) => {
    if (days === 0) {
      setStartDate('');
      setEndDate('');
    } else {
      setStartDate(format(subDays(new Date(), days), 'yyyy-MM-dd'));
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
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
