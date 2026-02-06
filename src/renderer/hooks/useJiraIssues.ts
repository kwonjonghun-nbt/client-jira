import { useQuery } from '@tanstack/react-query';
import type { StoredData } from '../types/jira.types';

export function useJiraIssues() {
  return useQuery<StoredData | null>({
    queryKey: ['jira', 'issues'],
    queryFn: () => window.electronAPI.storage.getLatest(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
