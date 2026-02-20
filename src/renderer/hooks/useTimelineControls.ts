import type { NormalizedIssue } from '../types/jira.types';
import { useTimelineFilters } from './useTimelineFilters';
import { useTimelineViewport } from './useTimelineViewport';

export function useTimelineControls(filteredIssues: NormalizedIssue[]) {
  const filters = useTimelineFilters(filteredIssues);
  const viewport = useTimelineViewport();

  return { ...filters, ...viewport };
}
