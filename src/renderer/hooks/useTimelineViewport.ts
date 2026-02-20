import { useState } from 'react';
import type { ViewMode } from '../components/timeline/TimelineHeader';

export function useTimelineViewport() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [zoom, setZoom] = useState(1);
  const [scrollToTodayTrigger, setScrollToTodayTrigger] = useState(1);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);

  return {
    viewMode,
    setViewMode,
    zoom,
    setZoom,
    scrollToTodayTrigger,
    setScrollToTodayTrigger,
    controlsCollapsed,
    setControlsCollapsed,
  };
}
