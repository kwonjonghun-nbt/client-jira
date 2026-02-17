import { useState, useRef, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { useOnClickOutside } from 'usehooks-ts';
import type { ViewMode } from '../components/timeline/TimelineHeader';
import type { NormalizedIssue } from '../types/jira.types';
import { DATE_PRESETS, formatDateISO } from '../utils/dashboard';
import { filterByDateRange, filterByRowTypes, extractIssueTypeOptions } from '../utils/timeline';

export function useTimelineControls(filteredIssues: NormalizedIssue[]) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [zoom, setZoom] = useState(1);
  const [scrollToTodayTrigger, setScrollToTodayTrigger] = useState(1);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [hiddenRowTypes, setHiddenRowTypes] = useState<Set<string>>(new Set());
  const [activePreset, setActivePreset] = useState(30);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

  const [dateStart, setDateStart] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateEnd, setDateEnd] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Close settings dropdown when clicking outside
  useOnClickOutside(settingsRef, () => setSettingsOpen(false));

  const applyDatePreset = (days: number) => {
    setActivePreset(days);
    if (days === 0) {
      setDateStart('');
      setDateEnd('');
    } else {
      setDateStart(format(subDays(new Date(), days), 'yyyy-MM-dd'));
      setDateEnd(format(new Date(), 'yyyy-MM-dd'));
    }
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

  // Derived values using utils
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
    viewMode,
    setViewMode,
    zoom,
    setZoom,
    scrollToTodayTrigger,
    setScrollToTodayTrigger,
    hiddenTypes,
    hiddenRowTypes,
    activePreset,
    setActivePreset,
    settingsOpen,
    setSettingsOpen,
    controlsCollapsed,
    setControlsCollapsed,
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
  };
}
