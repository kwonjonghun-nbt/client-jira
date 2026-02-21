import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Settings } from '../types/settings.types';
import type { JiraProject } from '../types/jira.types';

export function useSettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery<Settings | null>({
    queryKey: ['settings'],
    queryFn: () => window.electronAPI.settings.load(),
  });

  const saveSettings = useMutation({
    mutationFn: (settings: Settings) => window.electronAPI.settings.save(settings),
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: ['settings'] });
      const previous = queryClient.getQueryData<Settings | null>(['settings']);
      queryClient.setQueryData(['settings'], newSettings);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['settings'], context.previous);
      }
      toast.error('설정 저장에 실패했습니다');
    },
    onSuccess: () => {
      toast.success('설정이 저장되었습니다');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    saveSettings: saveSettings.mutate,
    isSaving: saveSettings.isPending,
  };
}

export function useJiraProjects() {
  return useQuery<JiraProject[]>({
    queryKey: ['jira', 'projects'],
    queryFn: () => window.electronAPI.jira.getProjects(),
    staleTime: Infinity,
    enabled: false,
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (params: { url: string; email: string; token: string }) =>
      window.electronAPI.jira.testConnection(params),
  });
}
