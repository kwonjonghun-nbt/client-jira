import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { LabelNote } from '../types/jira.types';

const QUERY_KEY = ['label-notes'];

export function useLabelNotes() {
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery<LabelNote[]>({
    queryKey: QUERY_KEY,
    queryFn: () => window.electronAPI.storage.getLabelNotes(),
  });

  const saveMutation = useMutation({
    mutationFn: (updated: LabelNote[]) =>
      window.electronAPI.storage.saveLabelNotes(updated),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<LabelNote[]>(QUERY_KEY);
      queryClient.setQueryData(QUERY_KEY, newData);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
      toast.error('라벨 메모 저장에 실패했습니다');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const saveNote = (label: string, description: string) => {
    const now = new Date().toISOString();
    const existing = notes.find((n) => n.label === label);
    let updated: LabelNote[];
    if (existing) {
      updated = notes.map((n) =>
        n.label === label ? { ...n, description, updatedAt: now } : n,
      );
    } else {
      updated = [...notes, { label, description, updatedAt: now }];
    }
    saveMutation.mutate(updated);
  };

  const deleteNote = (label: string) => {
    const updated = notes.filter((n) => n.label !== label);
    saveMutation.mutate(updated);
  };

  return { notes, isLoading, saveNote, deleteNote };
}
