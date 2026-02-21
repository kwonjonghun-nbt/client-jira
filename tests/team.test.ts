import { describe, it, expect } from 'vitest';
import { migrateToTeams } from '../src/main/utils/settings-migration';
import { filterIssuesByTeam, filterStoredDataByTeam } from '../src/renderer/utils/team-filters';
import { DEFAULT_SETTINGS } from '../src/main/schemas/settings.schema';
import type { Settings, Team } from '../src/main/schemas/settings.schema';
import type { NormalizedIssue, StoredData } from '../src/main/schemas/storage.schema';

// --- migrateToTeams ---

describe('migrateToTeams', () => {
  it('teams가 이미 있으면 그대로 반환', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      teams: [{
        id: 'existing',
        name: '기존 팀',
        color: '#EF4444',
        assignees: ['alice'],
        slack: DEFAULT_SETTINGS.slack,
      }],
    };
    const result = migrateToTeams(settings);
    expect(result.teams).toHaveLength(1);
    expect(result.teams[0].id).toBe('existing');
  });

  it('assignees가 비어있으면 빈 teams 유지', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      collection: { ...DEFAULT_SETTINGS.collection, assignees: [] },
    };
    const result = migrateToTeams(settings);
    expect(result.teams).toHaveLength(0);
  });

  it('기존 assignees + slack을 "기본 팀"으로 마이그레이션', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      collection: {
        ...DEFAULT_SETTINGS.collection,
        assignees: ['alice', 'bob'],
      },
      slack: {
        ...DEFAULT_SETTINGS.slack,
        enabled: true,
        webhookUrl: 'https://hooks.slack.com/test',
      },
    };

    const result = migrateToTeams(settings);

    expect(result.teams).toHaveLength(1);
    expect(result.teams[0].name).toBe('기본 팀');
    expect(result.teams[0].color).toBe('#3B82F6');
    expect(result.teams[0].assignees).toEqual(['alice', 'bob']);
    expect(result.teams[0].slack.enabled).toBe(true);
    expect(result.teams[0].slack.webhookUrl).toBe('https://hooks.slack.com/test');
    expect(result.teams[0].id).toBeTruthy();
    expect(result.teams[0].id.length).toBe(8);
  });

  it('원본 settings를 변경하지 않음 (immutable)', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      collection: {
        ...DEFAULT_SETTINGS.collection,
        assignees: ['alice'],
      },
    };
    const original = JSON.parse(JSON.stringify(settings));
    migrateToTeams(settings);
    expect(settings).toEqual(original);
  });
});

// --- filterIssuesByTeam ---

function makeIssue(key: string, assignee: string | null, assigneeEmail?: string | null): NormalizedIssue {
  return {
    key,
    summary: `Issue ${key}`,
    description: null,
    status: 'In Progress',
    statusCategory: 'indeterminate',
    assignee,
    assigneeEmail: assigneeEmail ?? null,
    reporter: null,
    priority: 'Medium',
    issueType: 'Task',
    storyPoints: null,
    sprint: null,
    labels: [],
    components: [],
    created: '2024-01-01T00:00:00.000Z',
    updated: '2024-01-01T00:00:00.000Z',
    startDate: null,
    dueDate: null,
    resolution: null,
    timeTracking: null,
    parent: null,
    subtasks: [],
    issueLinks: [],
  };
}

const makeTeam = (assignees: string[]): Team => ({
  id: 'team-1',
  name: 'FE팀',
  color: '#3B82F6',
  assignees,
  slack: DEFAULT_SETTINGS.slack,
});

describe('filterIssuesByTeam', () => {
  const issues = [
    makeIssue('PROJ-1', 'alice'),
    makeIssue('PROJ-2', 'bob'),
    makeIssue('PROJ-3', 'charlie'),
    makeIssue('PROJ-4', null),
  ];

  it('team이 null이면 전체 이슈 반환', () => {
    expect(filterIssuesByTeam(issues, null)).toEqual(issues);
  });

  it('팀 assignees로 필터링', () => {
    const team = makeTeam(['alice', 'bob']);
    const result = filterIssuesByTeam(issues, team);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.key)).toEqual(['PROJ-1', 'PROJ-2']);
  });

  it('assignee가 null인 이슈는 제외', () => {
    const team = makeTeam(['alice']);
    const result = filterIssuesByTeam(issues, team);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('PROJ-1');
  });

  it('팀 assignees가 비어있으면 전체 반환', () => {
    const team = makeTeam([]);
    expect(filterIssuesByTeam(issues, team)).toEqual(issues);
  });

  it('매칭되는 이슈가 없으면 빈 배열', () => {
    const team = makeTeam(['unknown']);
    expect(filterIssuesByTeam(issues, team)).toHaveLength(0);
  });

  it('이메일로 등록한 assignee도 매칭', () => {
    const issuesWithEmail = [
      makeIssue('PROJ-1', 'Alice Kim', 'alice@company.com'),
      makeIssue('PROJ-2', 'Bob Lee', 'bob@company.com'),
      makeIssue('PROJ-3', 'Charlie', 'charlie@company.com'),
    ];
    const team = makeTeam(['alice@company.com', 'bob@company.com']);
    const result = filterIssuesByTeam(issuesWithEmail, team);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.key)).toEqual(['PROJ-1', 'PROJ-2']);
  });

  it('displayName과 email 혼합 매칭', () => {
    const issuesWithEmail = [
      makeIssue('PROJ-1', 'Alice Kim', 'alice@company.com'),
      makeIssue('PROJ-2', 'Bob Lee', 'bob@company.com'),
    ];
    const team = makeTeam(['Alice Kim', 'bob@company.com']);
    const result = filterIssuesByTeam(issuesWithEmail, team);
    expect(result).toHaveLength(2);
  });
});

// --- filterStoredDataByTeam ---

describe('filterStoredDataByTeam', () => {
  const storedData: StoredData = {
    syncedAt: '2024-01-01T00:00:00.000Z',
    source: { baseUrl: 'https://jira.test.com', projects: ['PROJ'] },
    issues: [
      makeIssue('PROJ-1', 'alice'),
      makeIssue('PROJ-2', 'bob'),
      makeIssue('PROJ-3', 'charlie'),
    ],
    totalCount: 3,
  };

  it('team이 null이면 원본 그대로', () => {
    expect(filterStoredDataByTeam(storedData, null)).toBe(storedData);
  });

  it('팀 필터 적용 후 totalCount 갱신', () => {
    const team = makeTeam(['alice']);
    const result = filterStoredDataByTeam(storedData, team);
    expect(result.issues).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    expect(result.syncedAt).toBe(storedData.syncedAt);
  });
});
