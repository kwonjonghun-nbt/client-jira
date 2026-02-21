import crypto from 'node:crypto';
import type { Settings } from '../schemas/settings.schema';

/**
 * 기존 settings(teams 없음)를 teams 구조로 마이그레이션합니다.
 * 기존 collection.assignees, slack을 "기본 팀"으로 변환합니다.
 */
export function migrateToTeams(settings: Settings): Settings {
  if (settings.teams.length > 0) {
    return settings;
  }

  // assignees가 없으면 빈 팀 배열 유지 (설정이 아직 안 된 초기 상태)
  if (settings.collection.assignees.length === 0) {
    return settings;
  }

  return {
    ...settings,
    teams: [
      {
        id: crypto.randomUUID().slice(0, 8),
        name: '기본 팀',
        color: '#3B82F6',
        assignees: [...settings.collection.assignees],
        slack: { ...settings.slack },
      },
    ],
  };
}
