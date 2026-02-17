import { useQuery } from '@tanstack/react-query';
import { extractStatusTransitions, analyzeStatusTransitions } from '../utils/status-transitions';
import type { StatusTransitionAnalysis } from '../types/jira.types';

export function useStatusTransitions(issueKey: string | null, currentStatus: string) {
  return useQuery<StatusTransitionAnalysis | null>({
    queryKey: ['status-transitions', issueKey],
    queryFn: async () => {
      const histories = await window.electronAPI.jira.getIssueChangelog(issueKey!);
      const transitions = extractStatusTransitions(histories);
      return analyzeStatusTransitions(transitions, currentStatus);
    },
    enabled: !!issueKey,
    staleTime: 5 * 60_000,
  });
}
