import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SyncStatus, SyncResult } from '../types/jira.types';

export function useSyncStatus() {
  const queryClient = useQueryClient();

  const statusQuery = useQuery<SyncStatus>({
    queryKey: ['sync', 'status'],
    queryFn: () => window.electronAPI.sync.getStatus(),
    refetchInterval: 5_000,
  });

  const triggerSync = useMutation<SyncResult>({
    mutationFn: () => window.electronAPI.sync.trigger(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jira', 'issues'] });
      queryClient.invalidateQueries({ queryKey: ['sync', 'status'] });
    },
  });

  return {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    triggerSync: triggerSync.mutate,
    isSyncing: triggerSync.isPending || statusQuery.data?.isRunning,
    syncError: triggerSync.error,
  };
}
