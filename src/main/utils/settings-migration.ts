import crypto from 'node:crypto';
import type { Settings, SlackSettings } from '../schemas/settings.schema';
import { SlackSettingsSchema } from '../schemas/settings.schema';

/**
 * 기존 settings(teams 없음)를 teams 구조로 마이그레이션합니다.
 * 기존 collection.assignees, slack을 "기본 팀"으로 변환합니다.
 *
 * 참고: v0.12.0 이전에는 Settings에 앱 레벨 slack 필드가 있었으나 제거됨.
 * 마이그레이션 시 레거시 slack 필드를 팀으로 옮기고 제거합니다.
 */
export function migrateToTeams(settings: Settings & { slack?: SlackSettings }): Settings {
  if (settings.teams.length > 0) {
    // 레거시 slack 필드가 남아있으면 제거
    const { slack: _removed, ...rest } = settings as Settings & { slack?: SlackSettings };
    return rest as Settings;
  }

  // assignees가 없으면 빈 팀 배열 유지 (설정이 아직 안 된 초기 상태)
  if (settings.collection.assignees.length === 0) {
    const { slack: _removed, ...rest } = settings as Settings & { slack?: SlackSettings };
    return rest as Settings;
  }

  const legacySlack = settings.slack ?? SlackSettingsSchema.parse({});
  const { slack: _removed, ...rest } = settings as Settings & { slack?: SlackSettings };

  return {
    ...rest,
    teams: [
      {
        id: crypto.randomUUID().slice(0, 8),
        name: '기본 팀',
        color: '#3B82F6',
        assignees: [...settings.collection.assignees],
        slack: { ...legacySlack },
      },
    ],
  } as Settings;
}
