import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['jira', 'issues'] });
        toast.success(`동기화 완료 (${result.issueCount}건)`);
      } else {
        toast.error('동기화에 실패했습니다');
      }
      queryClient.invalidateQueries({ queryKey: ['sync', 'status'] });
    },
    onError: () => {
      toast.error('동기화 중 오류가 발생했습니다');
    },
  });

  return {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    triggerSync: triggerSync.mutate,
    isSyncing: triggerSync.isPending || statusQuery.data?.isRunning,
    syncResult: triggerSync.data,
    syncError: triggerSync.error,
  };
}
