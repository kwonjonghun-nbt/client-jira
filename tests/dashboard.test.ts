import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NormalizedIssue, ChangelogEntry } from '../src/renderer/types/jira.types';
import {
  getWeekRange,
  formatDateISO,
  formatChangeValue,
  computeDashboardStats,
  filterDashboardIssues,
} from '../src/renderer/utils/dashboard';

function makeIssue(overrides: Partial<NormalizedIssue> & { key: string }): NormalizedIssue {
  return {
    summary: 'Test issue',
    description: null,
    status: 'To Do',
    statusCategory: 'new',
    assignee: null,
    reporter: null,
    priority: 'Medium',
    issueType: 'Task',
    storyPoints: null,
    sprint: null,
    labels: [],
    components: [],
    created: '2025-01-15T00:00:00Z',
    updated: '2025-01-15T00:00:00Z',
    startDate: null,
    dueDate: null,
    resolution: null,
    timeTracking: null,
    parent: null,
    subtasks: [],
    issueLinks: [],
    ...overrides,
  };
}

describe('getWeekRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('현재 주의 월요일과 일요일을 반환한다', () => {
    // 2025-06-11은 수요일
    vi.setSystemTime(new Date('2025-06-11T09:00:00Z'));

    const [monday, sunday] = getWeekRange();

    // 월요일과 일요일의 요일을 확인
    expect(monday.getDay()).toBe(1); // Monday
    expect(sunday.getDay()).toBe(0); // Sunday
    // 일요일이 월요일 약 6일 후임을 확인 (23:59:59 때문에 조금 더 많음)
    const dayDiff = (sunday.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24);
    expect(dayDiff).toBeGreaterThan(5.99);
    expect(dayDiff).toBeLessThan(7);
  });

  it('월요일은 00:00:00으로 시작한다', () => {
    vi.setSystemTime(new Date('2025-06-11T09:00:00Z'));

    const [monday] = getWeekRange();

    expect(monday.getHours()).toBe(0);
    expect(monday.getMinutes()).toBe(0);
    expect(monday.getSeconds()).toBe(0);
    expect(monday.getMilliseconds()).toBe(0);
  });

  it('일요일은 23:59:59로 끝난다', () => {
    vi.setSystemTime(new Date('2025-06-11T09:00:00Z'));

    const [, sunday] = getWeekRange();

    expect(sunday.getHours()).toBe(23);
    expect(sunday.getMinutes()).toBe(59);
    expect(sunday.getSeconds()).toBe(59);
    expect(sunday.getMilliseconds()).toBe(999);
  });

  it('월요일 시작일 때 같은 주를 반환한다', () => {
    // 월요일인 경우
    vi.setSystemTime(new Date('2025-06-09T10:00:00Z'));

    const [monday, sunday] = getWeekRange();

    expect(monday.getDay()).toBe(1);
    expect(sunday.getDay()).toBe(0);
  });

  it('일요일 마지막일 때 같은 주를 반환한다', () => {
    // 일요일인 경우
    vi.setSystemTime(new Date('2025-06-15T23:00:00Z'));

    const [monday, sunday] = getWeekRange();

    expect(monday.getDay()).toBe(1);
    expect(sunday.getDay()).toBe(0);
  });
});

describe('formatDateISO', () => {
  it('Date 객체를 로컬 시간 기준 YYYY-MM-DD 문자열로 변환한다', () => {
    // format(d, 'yyyy-MM-dd')는 로컬 시간 기준 (UTC 타임존 버그 수정)
    const date = new Date(2025, 5, 11, 15, 30, 45); // 2025-06-11 15:30:45 로컬
    const result = formatDateISO(date);
    expect(result).toBe('2025-06-11');
  });

  it('월과 일이 한 자리일 때 0을 패딩한다', () => {
    const date = new Date(2025, 0, 5, 0, 0, 0); // 2025-01-05 로컬
    const result = formatDateISO(date);
    expect(result).toBe('2025-01-05');
  });

  it('12월 31일을 올바르게 포맷한다', () => {
    const date = new Date(2025, 11, 31, 23, 59, 59); // 2025-12-31 로컬
    const result = formatDateISO(date);
    expect(result).toBe('2025-12-31');
  });
});

describe('formatChangeValue', () => {
  it("created 타입은 '신규 생성'을 반환한다", () => {
    const entry: ChangelogEntry = {
      issueKey: 'P-1',
      summary: 'Test',
      changeType: 'created',
      oldValue: null,
      newValue: null,
      detectedAt: '2025-01-01',
    };
    expect(formatChangeValue(entry)).toBe('신규 생성');
  });

  it("resolved 타입은 '해결: {newValue}'를 반환한다", () => {
    const entry: ChangelogEntry = {
      issueKey: 'P-1',
      summary: 'Test',
      changeType: 'resolved',
      oldValue: 'In Progress',
      newValue: 'Done',
      detectedAt: '2025-01-01',
    };
    expect(formatChangeValue(entry)).toBe('해결: Done');
  });

  it("일반 변경은 '{oldValue} → {newValue}'를 반환한다", () => {
    const entry: ChangelogEntry = {
      issueKey: 'P-1',
      summary: 'Test',
      changeType: 'status',
      oldValue: 'To Do',
      newValue: 'In Progress',
      detectedAt: '2025-01-01',
    };
    expect(formatChangeValue(entry)).toBe('To Do → In Progress');
  });

  it("oldValue가 null이면 '(없음)'으로 표시한다", () => {
    const entry: ChangelogEntry = {
      issueKey: 'P-1',
      summary: 'Test',
      changeType: 'assignee',
      oldValue: null,
      newValue: 'John',
      detectedAt: '2025-01-01',
    };
    expect(formatChangeValue(entry)).toBe('(없음) → John');
  });

  it("newValue가 null이면 '(없음)'으로 표시한다", () => {
    const entry: ChangelogEntry = {
      issueKey: 'P-1',
      summary: 'Test',
      changeType: 'assignee',
      oldValue: 'John',
      newValue: null,
      detectedAt: '2025-01-01',
    };
    expect(formatChangeValue(entry)).toBe('John → (없음)');
  });

  it('priority 변경을 포맷한다', () => {
    const entry: ChangelogEntry = {
      issueKey: 'P-1',
      summary: 'Test',
      changeType: 'priority',
      oldValue: 'Medium',
      newValue: 'High',
      detectedAt: '2025-01-01',
    };
    expect(formatChangeValue(entry)).toBe('Medium → High');
  });

  it('storyPoints 변경을 포맷한다', () => {
    const entry: ChangelogEntry = {
      issueKey: 'P-1',
      summary: 'Test',
      changeType: 'storyPoints',
      oldValue: '5',
      newValue: '8',
      detectedAt: '2025-01-01',
    };
    expect(formatChangeValue(entry)).toBe('5 → 8');
  });
});

describe('computeDashboardStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-11T09:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('상태별 카운트를 계산한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', statusCategory: 'new' }),
      makeIssue({ key: 'P-2', statusCategory: 'indeterminate' }),
      makeIssue({ key: 'P-3', statusCategory: 'indeterminate' }),
      makeIssue({ key: 'P-4', statusCategory: 'done' }),
    ];

    const stats = computeDashboardStats(issues);

    expect(stats.totalCount).toBe(4);
    expect(stats.newCount).toBe(1);
    expect(stats.inProgressCount).toBe(2);
    expect(stats.doneCount).toBe(1);
  });

  it('이번 주 마감 이슈를 마감일 순으로 반환한다', () => {
    // 월요일(06-09) ~ 일요일(06-15)
    const issues = [
      makeIssue({ key: 'P-1', dueDate: '2025-06-15' }), // 일요일
      makeIssue({ key: 'P-2', dueDate: '2025-06-09' }), // 월요일
      makeIssue({ key: 'P-3', dueDate: '2025-06-12' }), // 목요일
      makeIssue({ key: 'P-4', dueDate: '2025-06-08' }), // 일주일 전 (범위 밖)
    ];

    const stats = computeDashboardStats(issues);

    expect(stats.dueThisWeek).toHaveLength(3);
    expect(stats.dueThisWeek[0].key).toBe('P-2'); // 06-09 first
    expect(stats.dueThisWeek[1].key).toBe('P-3'); // 06-12 second
    expect(stats.dueThisWeek[2].key).toBe('P-1'); // 06-15 last
  });

  it('이번 주 마감 이슈는 최대 10건을 반환한다', () => {
    const issues = Array.from({ length: 15 }, (_, i) => {
      const day = 9 + (i % 7); // 06-09 ~ 06-15 반복
      return makeIssue({
        key: `P-${i + 1}`,
        dueDate: `2025-06-${String(day).padStart(2, '0')}`,
      });
    });

    const stats = computeDashboardStats(issues);

    expect(stats.dueThisWeek.length).toBeLessThanOrEqual(10);
  });

  it('담당자별 워크로드를 계산한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', assignee: 'Alice', statusCategory: 'indeterminate' }),
      makeIssue({ key: 'P-2', assignee: 'Alice', statusCategory: 'indeterminate' }),
      makeIssue({ key: 'P-3', assignee: 'Bob', statusCategory: 'indeterminate' }),
      makeIssue({ key: 'P-4', assignee: 'Bob', statusCategory: 'done' }), // done 제외
    ];

    const stats = computeDashboardStats(issues);

    expect(stats.workload).toContainEqual({ name: 'Alice', count: 2 });
    expect(stats.workload).toContainEqual({ name: 'Bob', count: 1 });
  });

  it('done 상태 이슈는 워크로드에서 제외한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', assignee: 'Alice', statusCategory: 'done' }),
      makeIssue({ key: 'P-2', assignee: 'Alice', statusCategory: 'indeterminate' }),
      makeIssue({ key: 'P-3', assignee: 'Bob', statusCategory: 'done' }),
    ];

    const stats = computeDashboardStats(issues);

    expect(stats.workload).toHaveLength(1);
    expect(stats.workload[0]).toEqual({ name: 'Alice', count: 1 });
  });

  it('담당자가 없으면 "(미할당)"으로 집계한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', assignee: null, statusCategory: 'indeterminate' }),
      makeIssue({ key: 'P-2', assignee: null, statusCategory: 'indeterminate' }),
      makeIssue({ key: 'P-3', assignee: 'Alice', statusCategory: 'indeterminate' }),
    ];

    const stats = computeDashboardStats(issues);

    expect(stats.workload).toContainEqual({ name: '(미할당)', count: 2 });
  });

  it('워크로드를 count 내림차순으로 정렬한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', assignee: 'Alice', statusCategory: 'indeterminate' }),
      makeIssue({ key: 'P-2', assignee: 'Bob', statusCategory: 'indeterminate' }),
      makeIssue({ key: 'P-3', assignee: 'Bob', statusCategory: 'indeterminate' }),
      makeIssue({ key: 'P-4', assignee: 'Bob', statusCategory: 'indeterminate' }),
    ];

    const stats = computeDashboardStats(issues);

    expect(stats.workload[0].name).toBe('Bob');
    expect(stats.workload[0].count).toBe(3);
    expect(stats.workload[1].name).toBe('Alice');
    expect(stats.workload[1].count).toBe(1);
  });

  it('워크로드는 최대 8명을 반환한다', () => {
    const issues = Array.from({ length: 15 }, (_, i) => {
      return makeIssue({
        key: `P-${i + 1}`,
        assignee: `User${i}`,
        statusCategory: 'indeterminate',
      });
    });

    const stats = computeDashboardStats(issues);

    expect(stats.workload.length).toBeLessThanOrEqual(8);
  });

  it('maxWorkload는 최소 1이다', () => {
    const issues: NormalizedIssue[] = [];
    const stats = computeDashboardStats(issues);
    expect(stats.maxWorkload).toBe(1);
  });

  it('maxWorkload는 가장 많은 워크로드를 반환한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', assignee: 'Alice', statusCategory: 'indeterminate' }),
      makeIssue({ key: 'P-2', assignee: 'Alice', statusCategory: 'indeterminate' }),
      makeIssue({ key: 'P-3', assignee: 'Alice', statusCategory: 'indeterminate' }),
      makeIssue({ key: 'P-4', assignee: 'Bob', statusCategory: 'indeterminate' }),
    ];

    const stats = computeDashboardStats(issues);

    expect(stats.maxWorkload).toBe(3);
  });

  it('최근 업데이트된 이슈를 반환한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', updated: '2025-06-11T10:00:00Z' }),
      makeIssue({ key: 'P-2', updated: '2025-06-11T08:00:00Z' }),
      makeIssue({ key: 'P-3', updated: '2025-06-11T12:00:00Z' }),
    ];

    const stats = computeDashboardStats(issues);

    expect(stats.recentlyUpdated[0].key).toBe('P-3');
    expect(stats.recentlyUpdated[1].key).toBe('P-1');
    expect(stats.recentlyUpdated[2].key).toBe('P-2');
  });

  it('최근 업데이트 이슈는 최대 8건을 반환한다', () => {
    const issues = Array.from({ length: 15 }, (_, i) => {
      return makeIssue({
        key: `P-${i + 1}`,
        updated: new Date(2025, 5, 11, i).toISOString(),
      });
    });

    const stats = computeDashboardStats(issues);

    expect(stats.recentlyUpdated.length).toBeLessThanOrEqual(8);
  });

  it('이슈 타입 분포를 반환한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', issueType: 'Story' }),
      makeIssue({ key: 'P-2', issueType: 'Story' }),
      makeIssue({ key: 'P-3', issueType: 'Task' }),
      makeIssue({ key: 'P-4', issueType: 'Bug' }),
    ];

    const stats = computeDashboardStats(issues);

    expect(stats.typeDistribution).toContainEqual({ type: 'story', count: 2 });
    expect(stats.typeDistribution).toContainEqual({ type: 'task', count: 1 });
    expect(stats.typeDistribution).toContainEqual({ type: 'bug', count: 1 });
  });

  it('이슈 타입을 normalizeType으로 정규화한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', issueType: '스토리' }),
      makeIssue({ key: 'P-2', issueType: 'story' }),
      makeIssue({ key: 'P-3', issueType: 'Story' }),
    ];

    const stats = computeDashboardStats(issues);

    const storyDistribution = stats.typeDistribution.find((t) => t.type === 'story');
    expect(storyDistribution?.count).toBe(3);
  });

  it('빈 배열이면 모든 카운트가 0이다', () => {
    const stats = computeDashboardStats([]);

    expect(stats.totalCount).toBe(0);
    expect(stats.newCount).toBe(0);
    expect(stats.inProgressCount).toBe(0);
    expect(stats.doneCount).toBe(0);
    expect(stats.dueThisWeek).toHaveLength(0);
    expect(stats.recentlyUpdated).toHaveLength(0);
    expect(stats.typeDistribution).toHaveLength(0);
  });

  it('빈 배열일 때 workload도 비어있다', () => {
    const stats = computeDashboardStats([]);
    expect(stats.workload).toHaveLength(0);
  });
});

describe('filterDashboardIssues', () => {
  it('담당자 필터가 "전체"이면 모든 이슈를 반환한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', assignee: 'Alice' }),
      makeIssue({ key: 'P-2', assignee: 'Bob' }),
      makeIssue({ key: 'P-3', assignee: null }),
    ];

    const result = filterDashboardIssues(issues, '', '', '전체');

    expect(result).toHaveLength(3);
  });

  it('특정 담당자로 필터링한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', assignee: 'Alice' }),
      makeIssue({ key: 'P-2', assignee: 'Bob' }),
      makeIssue({ key: 'P-3', assignee: 'Alice' }),
    ];

    const result = filterDashboardIssues(issues, '', '', 'Alice');

    expect(result).toHaveLength(2);
    expect(result[0].key).toBe('P-1');
    expect(result[1].key).toBe('P-3');
  });

  it('날짜 범위로 필터링한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', created: '2025-01-10T00:00:00Z' }),
      makeIssue({ key: 'P-2', created: '2025-01-15T00:00:00Z' }),
      makeIssue({ key: 'P-3', created: '2025-01-20T00:00:00Z' }),
    ];

    const result = filterDashboardIssues(issues, '2025-01-12', '2025-01-18', '전체');

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('P-2');
  });

  it('날짜와 담당자를 동시에 필터링한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', assignee: 'Alice', created: '2025-01-10T00:00:00Z' }),
      makeIssue({ key: 'P-2', assignee: 'Bob', created: '2025-01-15T00:00:00Z' }),
      makeIssue({ key: 'P-3', assignee: 'Alice', created: '2025-01-20T00:00:00Z' }),
    ];

    const result = filterDashboardIssues(issues, '2025-01-12', '2025-01-18', 'Alice');

    expect(result).toHaveLength(0);
  });

  it('날짜가 모두 비어있으면 날짜 필터를 적용하지 않는다', () => {
    const issues = [
      makeIssue({ key: 'P-1', assignee: 'Alice', created: '2025-01-10T00:00:00Z' }),
      makeIssue({ key: 'P-2', assignee: 'Bob', created: '2025-01-15T00:00:00Z' }),
    ];

    const result = filterDashboardIssues(issues, '', '', 'Alice');

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('P-1');
  });

  it('시작 날짜만 설정하면 그 이후 모든 이슈를 반환한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', created: '2025-01-10T00:00:00Z' }),
      makeIssue({ key: 'P-2', created: '2025-01-15T00:00:00Z' }),
      makeIssue({ key: 'P-3', created: '2025-01-20T00:00:00Z' }),
    ];

    const result = filterDashboardIssues(issues, '2025-01-12', '', '전체');

    expect(result).toHaveLength(2);
    expect(result.map((i) => i.key)).toEqual(['P-2', 'P-3']);
  });

  it('종료 날짜만 설정하면 그 이전 모든 이슈를 반환한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', created: '2025-01-10T00:00:00Z' }),
      makeIssue({ key: 'P-2', created: '2025-01-15T00:00:00Z' }),
      makeIssue({ key: 'P-3', created: '2025-01-20T00:00:00Z' }),
    ];

    const result = filterDashboardIssues(issues, '', '2025-01-18', '전체');

    expect(result).toHaveLength(2);
    expect(result.map((i) => i.key)).toEqual(['P-1', 'P-2']);
  });

  it('dueDate로도 필터링한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', dueDate: '2025-01-10', created: '2025-01-01T00:00:00Z' }),
      makeIssue({ key: 'P-2', dueDate: '2025-01-15', created: '2025-01-12T00:00:00Z' }),
      makeIssue({ key: 'P-3', dueDate: '2025-01-20', created: '2025-01-19T00:00:00Z' }),
    ];

    const result = filterDashboardIssues(issues, '2025-01-12', '2025-01-18', '전체');

    // P-2 (created: 01-12, due: 01-15) matches - created in range
    // P-3 (created: 01-19, due: 01-20) does not match - created after range
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('P-2');
  });

  it('created가 범위 내이면 dueDate와 관계없이 포함한다', () => {
    const issues = [
      makeIssue({
        key: 'P-1',
        created: '2025-01-15T00:00:00Z',
        dueDate: '2025-02-01',
      }),
    ];

    const result = filterDashboardIssues(issues, '2025-01-12', '2025-01-18', '전체');

    expect(result).toHaveLength(1);
  });

  it('dueDate가 범위 내이면 created와 관계없이 포함한다', () => {
    const issues = [
      makeIssue({
        key: 'P-1',
        created: '2025-01-01T00:00:00Z',
        dueDate: '2025-01-15',
      }),
    ];

    const result = filterDashboardIssues(issues, '2025-01-12', '2025-01-18', '전체');

    expect(result).toHaveLength(1);
  });

  it('created와 dueDate 사이에 범위를 포함하면 포함한다', () => {
    const issues = [
      makeIssue({
        key: 'P-1',
        created: '2025-01-01T00:00:00Z',
        dueDate: '2025-12-31',
      }),
    ];

    const result = filterDashboardIssues(issues, '2025-06-01', '2025-06-30', '전체');

    expect(result).toHaveLength(1);
  });

  it('dueDate가 없는 이슈는 created 기준으로만 필터링한다', () => {
    const issues = [
      makeIssue({
        key: 'P-1',
        created: '2025-01-15T00:00:00Z',
        dueDate: null,
      }),
    ];

    const result = filterDashboardIssues(issues, '2025-01-12', '2025-01-18', '전체');

    expect(result).toHaveLength(1);
  });

  it('범위를 벗어난 이슈는 제외한다', () => {
    const issues = [
      makeIssue({
        key: 'P-1',
        created: '2024-12-31T00:00:00Z',
        dueDate: '2025-01-05',
      }),
    ];

    const result = filterDashboardIssues(issues, '2025-01-12', '2025-01-18', '전체');

    expect(result).toHaveLength(0);
  });
});
