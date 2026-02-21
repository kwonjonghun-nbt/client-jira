import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { OKRData } from '../types/jira.types';

export function useOKR() {
  const queryClient = useQueryClient();

  const query = useQuery<OKRData | null>({
    queryKey: ['okr'],
    queryFn: () => window.electronAPI.storage.getOKR(),
  });

  const mutation = useMutation({
    mutationFn: (data: OKRData) => window.electronAPI.storage.saveOKR(data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['okr'] });
      const previousData = queryClient.getQueryData<OKRData | null>(['okr']);
      queryClient.setQueryData(['okr'], newData);
      return { previousData };
    },
    onError: (_err, _newData, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(['okr'], context.previousData);
      }
      toast.error('OKR 저장에 실패했습니다');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['okr'] });
    },
  });

  return { ...query, save: mutation.mutate, isSaving: mutation.isPending };
}
