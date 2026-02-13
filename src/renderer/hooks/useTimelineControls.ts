import { useState, useRef, useEffect, useMemo } from 'react';
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
  const settingsRef = useRef<HTMLDivElement>(null);

  const [dateStart, setDateStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDateISO(d);
  });
  const [dateEnd, setDateEnd] = useState(() => formatDateISO(new Date()));

  // Close settings dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
