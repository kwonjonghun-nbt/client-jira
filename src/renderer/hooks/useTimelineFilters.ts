import { useState, useMemo, useRef } from 'react';
import { format, subDays } from 'date-fns';
import { useOnClickOutside } from 'usehooks-ts';
import type { NormalizedIssue } from '../types/jira.types';
import { computeDatePresetRange } from '../utils/date-presets';
import { filterByDateRange, filterByRowTypes, extractIssueTypeOptions } from '../utils/timeline';

export function useTimelineFilters(filteredIssues: NormalizedIssue[]) {
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [hiddenRowTypes, setHiddenRowTypes] = useState<Set<string>>(new Set());
  const [activePreset, setActivePreset] = useState(30);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showTodayPanel, setShowTodayPanel] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

  const [dateStart, setDateStart] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateEnd, setDateEnd] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  useOnClickOutside(settingsRef, () => setSettingsOpen(false));

  const applyDatePreset = (days: number) => {
    setActivePreset(days);
    const { start, end } = computeDatePresetRange(days);
    setDateStart(start);
    setDateEnd(end);
  };

  const toggleType = (typeKey: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeKey)) next.delete(typeKey);
      else next.add(typeKey);
      return next;
    });
  };

  const toggleRowType = (typeKey: string) => {
    setHiddenRowTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeKey)) next.delete(typeKey);
      else next.add(typeKey);
      return next;
    });
  };

  const dateFilteredIssues = useMemo(
    () => filterByDateRange(filteredIssues, dateStart, dateEnd),
    [filteredIssues, dateStart, dateEnd]
  );
  const displayedIssues = useMemo(
    () => filterByRowTypes(dateFilteredIssues, hiddenRowTypes),
    [dateFilteredIssues, hiddenRowTypes]
  );
  const issueTypeOptions = useMemo(
    () => extractIssueTypeOptions(dateFilteredIssues),
    [dateFilteredIssues]
  );

  return {
    hiddenTypes,
    hiddenRowTypes,
    activePreset,
    setActivePreset,
    settingsOpen,
    setSettingsOpen,
    dateStart,
    setDateStart,
    dateEnd,
    setDateEnd,
    applyDatePreset,
    toggleType,
    toggleRowType,
    settingsRef,
    dateFilteredIssues,
    displayedIssues,
    issueTypeOptions,
    showTodayPanel,
    setShowTodayPanel,
  };
}
