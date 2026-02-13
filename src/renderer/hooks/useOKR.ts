import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OKRData } from '../types/jira.types';

export function useOKR() {
  const queryClient = useQueryClient();

  const query = useQuery<OKRData | null>({
    queryKey: ['okr'],
    queryFn: () => window.electronAPI.storage.getOKR(),
  });

  const mutation = useMutation({
    mutationFn: (data: OKRData) => window.electronAPI.storage.saveOKR(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['okr'] }),
  });

  return { ...query, save: mutation.mutate, isSaving: mutation.isPending };
}
