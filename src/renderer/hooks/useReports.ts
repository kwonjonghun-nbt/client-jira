import { useQuery } from '@tanstack/react-query';
import type { ReportMeta } from '../types/jira.types';

export function useReports() {
  const { data: reports = [], isLoading } = useQuery<ReportMeta[]>({
    queryKey: ['reports'],
    queryFn: () => window.electronAPI.storage.listReports(),
  });

  return { reports, isLoading };
}

export function useReport(filename: string | null) {
  const { data: content = null, isLoading } = useQuery<string | null>({
    queryKey: ['report', filename],
    queryFn: () => (filename ? window.electronAPI.storage.getReport(filename) : null),
    enabled: !!filename,
  });

  return { content, isLoading };
}
