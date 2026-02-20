import { format, subDays } from 'date-fns';
import { useMemo, useState } from 'react';
import type { NormalizedIssue } from '../types/jira.types';
import { computeLabelStats, computeLabelStatsSummary, matchPresetDays } from '../utils/stats';
import { computeDatePresetRange } from '../utils/date-presets';

export type StatsViewMode = 'table' | 'chart';

export function useStatsPage(filteredIssues: NormalizedIssue[]) {
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<StatsViewMode>('table');

  const applyPreset = (days: number) => {
    const { start, end } = computeDatePresetRange(days);
    setStartDate(start);
    setEndDate(end);
  };

  const activePresetDays = matchPresetDays(startDate, endDate);

  const labelStats = useMemo(
    () => computeLabelStats(filteredIssues, startDate, endDate),
    [filteredIssues, startDate, endDate],
  );

  const summary = useMemo(() => computeLabelStatsSummary(labelStats), [labelStats]);

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    viewMode,
    setViewMode,
    applyPreset,
    activePresetDays,
    labelStats,
    summary,
  };
}
