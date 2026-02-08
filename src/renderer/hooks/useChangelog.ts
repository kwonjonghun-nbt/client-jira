import { useQuery } from '@tanstack/react-query';
import type { ChangelogData } from '../types/jira.types';

export function useChangelog() {
  return useQuery<ChangelogData | null>({
    queryKey: ['changelog'],
    queryFn: () => window.electronAPI.storage.getChangelog(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
