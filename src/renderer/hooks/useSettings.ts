import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    onSuccess: (_data, variables) => {
      // 캐시를 직접 업데이트하여 즉시 반영
      queryClient.setQueryData(['settings'], variables);
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
