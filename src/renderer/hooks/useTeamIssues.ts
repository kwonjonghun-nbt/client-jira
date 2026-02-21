import { useMemo } from 'react';
import { useJiraIssues } from './useJiraIssues';
import { useSettings } from './useSettings';
import { useUIStore } from '../store/uiStore';
import { filterStoredDataByTeam } from '../utils/team-filters';

/**
 * useJiraIssues 위에 팀 필터 레이어를 추가합니다.
 * selectedTeamId가 null이면 전체 이슈를 반환합니다 ("전체" 모드).
 */
export function useTeamIssues() {
  const { data: rawData, isLoading, error, refetch } = useJiraIssues();
  const selectedTeamId = useUIStore((s) => s.selectedTeamId);
  const { settings } = useSettings();

  const teams = settings?.teams;

  const data = useMemo(() => {
    if (!rawData) return rawData;
    if (!selectedTeamId || !teams) return rawData;

    const team = teams.find((t) => t.id === selectedTeamId) ?? null;
    return filterStoredDataByTeam(rawData, team);
  }, [rawData, selectedTeamId, teams]);

  return { data, isLoading, error, refetch };
}
