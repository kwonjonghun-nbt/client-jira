import { describe, it, expect } from 'vitest';
import {
  filterIssuesToday,
  groupByAssignee,
  buildDailyReportPrompt,
  buildIssueDataForPrompt,
  formatReportForSlack,
  buildStructuredReport,
} from '../src/main/utils/daily-report';
import type { NormalizedIssue } from '../src/main/schemas/storage.schema';
import { SlackSettingsSchema, SettingsSchema } from '../src/main/schemas/settings.schema';

// 최소 필드만 채운 테스트용 이슈 팩토리
function makeIssue(overrides: Partial<NormalizedIssue> = {}): NormalizedIssue {
  return {
    key: 'PROJ-1',
    summary: 'Test issue',
    description: null,
    status: 'In Progress',
    statusCategory: 'indeterminate',
    assignee: '홍길동',
    reporter: '김철수',
    priority: 'Medium',
    issueType: 'Task',
    storyPoints: null,
    sprint: null,
    labels: [],
    components: [],
    created: '2026-02-19T09:00:00.000+0900',
    updated: '2026-02-19T10:00:00.000+0900',
    dueDate: null,
    resolution: null,
    timeTracking: null,
    parent: null,
    startDate: null,
    subtasks: [],
    issueLinks: [],
    ...overrides,
  };
}

describe('filterIssuesToday', () => {
  it('오늘 업데이트된 이슈만 필터링한다', () => {
    const issues = [
      makeIssue({ key: 'PROJ-1', updated: '2026-02-19T10:00:00.000+0900' }),
      makeIssue({ key: 'PROJ-2', updated: '2026-02-18T10:00:00.000+0900' }),
      makeIssue({ key: 'PROJ-3', updated: '2026-02-19T15:00:00.000+0900' }),
    ];

    const result = filterIssuesToday(issues, '2026-02-19');
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.key)).toEqual(['PROJ-1', 'PROJ-3']);
  });

  it('해당 날짜에 이슈가 없으면 빈 배열을 반환한다', () => {
    const issues = [makeIssue({ updated: '2026-02-18T10:00:00.000+0900' })];
    expect(filterIssuesToday(issues, '2026-02-19')).toEqual([]);
  });
});

describe('groupByAssignee', () => {
  it('담당자별로 이슈를 그룹핑한다', () => {
    const issues = [
      makeIssue({ key: 'PROJ-1', assignee: '홍길동' }),
      makeIssue({ key: 'PROJ-2', assignee: '김영희' }),
      makeIssue({ key: 'PROJ-3', assignee: '홍길동' }),
    ];

    const groups = groupByAssignee(issues);
    expect(groups.size).toBe(2);
    expect(groups.get('홍길동')).toHaveLength(2);
    expect(groups.get('김영희')).toHaveLength(1);
  });

  it('담당자가 없으면 "미지정"으로 그룹핑한다', () => {
    const issues = [
      makeIssue({ key: 'PROJ-1', assignee: null }),
      makeIssue({ key: 'PROJ-2', assignee: '홍길동' }),
    ];

    const groups = groupByAssignee(issues);
    expect(groups.get('미지정')).toHaveLength(1);
    expect(groups.get('홍길동')).toHaveLength(1);
  });
});

describe('buildDailyReportPrompt', () => {
  it('담당자와 날짜가 프롬프트에 포함된다', () => {
    const prompt = buildDailyReportPrompt('홍길동', '2026-02-19');
    expect(prompt).toContain('홍길동');
    expect(prompt).toContain('2026-02-19');
  });

  it('일일 공유 리포트 형식 섹션이 포함된다', () => {
    const prompt = buildDailyReportPrompt('홍길동', '2026-02-19');
    expect(prompt).toContain('오늘 진행한 작업');
    expect(prompt).toContain('현재 진행 중인 작업');
    expect(prompt).toContain('이슈/블로커');
    expect(prompt).toContain('내일 계획');
  });
});

describe('buildIssueDataForPrompt', () => {
  it('이슈 데이터를 JSON 문자열로 변환한다', () => {
    const issues = [makeIssue({ key: 'PROJ-1', summary: 'Test' })];
    const json = buildIssueDataForPrompt(issues);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].key).toBe('PROJ-1');
    expect(parsed[0].summary).toBe('Test');
  });

  it('필요한 필드만 포함한다', () => {
    const issues = [makeIssue()];
    const json = buildIssueDataForPrompt(issues);
    const parsed = JSON.parse(json);
    const keys = Object.keys(parsed[0]);
    expect(keys).toContain('key');
    expect(keys).toContain('summary');
    expect(keys).toContain('status');
    expect(keys).not.toContain('timeTracking');
    expect(keys).not.toContain('subtasks');
  });
});

describe('formatReportForSlack', () => {
  it('마크다운 헤딩을 슬랙 볼드로 변환한다', () => {
    const md = '# 제목\n## 소제목\n### 항목';
    const result = formatReportForSlack(md, '홍길동', '2026-02-19');
    expect(result).toContain('*제목*');
    expect(result).toContain('*소제목*');
    expect(result).toContain('*항목*');
    expect(result).not.toContain('#');
  });
});

describe('SlackSettingsSchema', () => {
  it('기본값이 올바르게 적용된다', () => {
    const result = SlackSettingsSchema.parse({});
    expect(result.enabled).toBe(false);
    expect(result.webhookUrl).toBe('');
    expect(result.dailyReportTime).toBe('11:20');
    expect(result.replyToThread).toBe(false);
    expect(result.botToken).toBe('');
    expect(result.channelId).toBe('');
    expect(result.threadSearchText).toBe('');
  });

  it('유효한 시간 형식을 통과한다', () => {
    const result = SlackSettingsSchema.parse({ dailyReportTime: '09:30' });
    expect(result.dailyReportTime).toBe('09:30');
  });

  it('잘못된 시간 형식은 거부한다', () => {
    expect(() => SlackSettingsSchema.parse({ dailyReportTime: '9:30' })).toThrow();
    expect(() => SlackSettingsSchema.parse({ dailyReportTime: 'invalid' })).toThrow();
  });

  it('기존 Settings 스키마에 slack 필드가 포함된다', () => {
    const settings = SettingsSchema.parse({
      jira: { baseUrl: 'https://test.atlassian.net', email: 'test@test.com' },
      collection: { projects: [], assignees: [], customJql: '' },
      schedule: { enabled: true, times: ['09:00'] },
      storage: { retentionDays: 90 },
    });
    expect(settings.slack).toBeDefined();
    expect(settings.slack.enabled).toBe(false);
  });

  it('스레드 댓글 설정을 파싱한다', () => {
    const result = SlackSettingsSchema.parse({
      replyToThread: true,
      botToken: 'xoxb-test-token',
      channelId: 'C0123456789',
      threadSearchText: '데일리 스탠드업',
    });
    expect(result.replyToThread).toBe(true);
    expect(result.botToken).toBe('xoxb-test-token');
    expect(result.channelId).toBe('C0123456789');
    expect(result.threadSearchText).toBe('데일리 스탠드업');
  });

  it('기존 설정(스레드 필드 없음)도 호환된다', () => {
    const result = SlackSettingsSchema.parse({
      enabled: true,
      webhookUrl: 'https://hooks.slack.com/services/xxx',
      dailyReportTime: '09:00',
    });
    expect(result.replyToThread).toBe(false);
    expect(result.botToken).toBe('');
    expect(result.channelId).toBe('');
    expect(result.threadSearchText).toBe('');
  });
});

describe('buildStructuredReport', () => {
  const baseUrl = 'https://jira.example.com';

  it('컴포넌트 → 에픽 → 하위작업 구조로 메시지를 생성한다', () => {
    const issues = [
      makeIssue({ key: 'AO-100', summary: '게이미피케이션 개선', issueType: 'Epic', components: ['게이미피케이션'], assignee: null, statusCategory: 'indeterminate' }),
      makeIssue({ key: 'AO-101', summary: 'API 리팩토링', issueType: 'Task', parent: 'AO-100', components: ['게이미피케이션'], assignee: '홍길동', status: '진행중', statusCategory: 'indeterminate' }),
      makeIssue({ key: 'AO-102', summary: '오류 핸들링 추가', issueType: 'Task', parent: 'AO-100', components: ['게이미피케이션'], assignee: '홍길동', status: '진행중', statusCategory: 'indeterminate' }),
    ];

    const result = buildStructuredReport('홍길동', issues, baseUrl);
    expect(result).toContain('*홍길동*');
    expect(result).toContain('*게이미피케이션*');
    expect(result).toContain('<https://jira.example.com/browse/AO-100|AO-100>');
    expect(result).toContain('<https://jira.example.com/browse/AO-101|AO-101> API 리팩토링 (진행중)');
    expect(result).toContain('<https://jira.example.com/browse/AO-102|AO-102> 오류 핸들링 추가 (진행중)');
  });

  it('진행중 하위작업이 없는 에픽은 생략한다', () => {
    const issues = [
      makeIssue({ key: 'AO-100', summary: '완료된 에픽', issueType: 'Epic', components: ['테스트'], assignee: null }),
      makeIssue({ key: 'AO-101', summary: '완료된 작업', issueType: 'Task', parent: 'AO-100', components: ['테스트'], assignee: '홍길동', statusCategory: 'done' }),
      makeIssue({ key: 'AO-200', summary: '진행중 에픽', issueType: 'Epic', components: ['테스트'], assignee: null }),
      makeIssue({ key: 'AO-201', summary: '진행중 작업', issueType: 'Task', parent: 'AO-200', components: ['테스트'], assignee: '홍길동', status: '진행중', statusCategory: 'indeterminate' }),
    ];

    const result = buildStructuredReport('홍길동', issues, baseUrl);
    expect(result).not.toContain('AO-100');
    expect(result).not.toContain('AO-101');
    expect(result).toContain('AO-200');
    expect(result).toContain('AO-201');
  });

  it('담당자의 진행중 작업이 없으면 빈 문자열을 반환한다', () => {
    const issues = [
      makeIssue({ key: 'AO-100', summary: '완료된 작업', assignee: '홍길동', statusCategory: 'done' }),
    ];

    const result = buildStructuredReport('홍길동', issues, baseUrl);
    expect(result).toBe('');
  });

  it('여러 컴포넌트의 이슈를 각각 그룹핑한다', () => {
    const issues = [
      makeIssue({ key: 'AO-100', summary: '에픽A', issueType: 'Epic', components: ['홈 화면'], assignee: null }),
      makeIssue({ key: 'AO-101', summary: '작업A', issueType: 'Task', parent: 'AO-100', components: ['홈 화면'], assignee: '홍길동', status: '진행중', statusCategory: 'indeterminate' }),
      makeIssue({ key: 'AO-200', summary: '에픽B', issueType: 'Epic', components: ['설정'], assignee: null }),
      makeIssue({ key: 'AO-201', summary: '작업B', issueType: 'Task', parent: 'AO-200', components: ['설정'], assignee: '홍길동', status: '진행중', statusCategory: 'indeterminate' }),
    ];

    const result = buildStructuredReport('홍길동', issues, baseUrl);
    expect(result).toContain('*홈 화면*');
    expect(result).toContain('*설정*');
  });

  it('컴포넌트가 없는 이슈는 기타로 분류한다', () => {
    const issues = [
      makeIssue({ key: 'AO-100', summary: '에픽', issueType: 'Epic', components: [], assignee: null }),
      makeIssue({ key: 'AO-101', summary: '작업', issueType: 'Task', parent: 'AO-100', components: [], assignee: '홍길동', status: '진행중', statusCategory: 'indeterminate' }),
    ];

    const result = buildStructuredReport('홍길동', issues, baseUrl);
    expect(result).toContain('*기타*');
  });

  it('Jira URL 링크가 올바르게 생성된다', () => {
    const issues = [
      makeIssue({ key: 'AO-100', summary: '단독 작업', assignee: '홍길동', status: '진행중', statusCategory: 'indeterminate', components: ['공통'] }),
    ];

    const result = buildStructuredReport('홍길동', issues, 'https://myteam.atlassian.net/');
    // trailing slash 제거 확인
    expect(result).toContain('<https://myteam.atlassian.net/browse/AO-100|AO-100>');
  });
});
