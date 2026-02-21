import { describe, it, expect } from 'vitest';
import type { NormalizedIssue } from '../src/main/schemas/storage.schema';
import { filterByDateRange, filterByRowTypes, extractIssueTypeOptions } from '../src/renderer/utils/timeline';

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
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z',
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

describe('기간 필터 로직', () => {
  it('생성일이 기간 내인 이슈를 포함한다', () => {
    const issues = [makeIssue({ key: 'P-1', created: '2025-01-10T00:00:00Z' })];
    const result = filterByDateRange(issues, '2025-01-01', '2025-01-31');
    expect(result).toHaveLength(1);
  });

  it('마감일이 기간 내인 이슈를 포함한다', () => {
    const issues = [makeIssue({ key: 'P-1', created: '2024-12-01T00:00:00Z', dueDate: '2025-01-15' })];
    const result = filterByDateRange(issues, '2025-01-01', '2025-01-31');
    expect(result).toHaveLength(1);
  });

  it('이슈 기간이 선택 기간을 감싸는 경우 포함한다', () => {
    const issues = [makeIssue({ key: 'P-1', created: '2024-12-01T00:00:00Z', dueDate: '2025-02-28' })];
    const result = filterByDateRange(issues, '2025-01-01', '2025-01-31');
    expect(result).toHaveLength(1);
  });

  it('기간 밖의 이슈는 제외한다', () => {
    const issues = [makeIssue({ key: 'P-1', created: '2025-03-01T00:00:00Z' })];
    const result = filterByDateRange(issues, '2025-01-01', '2025-01-31');
    expect(result).toHaveLength(0);
  });

  it('기간이 비어있으면 전체를 반환한다', () => {
    const issues = [makeIssue({ key: 'P-1' }), makeIssue({ key: 'P-2' })];
    const result = filterByDateRange(issues, '', '');
    expect(result).toHaveLength(2);
  });
});

describe('행 타입 필터링', () => {
  const issues = [
    makeIssue({ key: 'P-1', issueType: 'Task' }),
    makeIssue({ key: 'P-2', issueType: 'Bug' }),
    makeIssue({ key: 'P-3', issueType: 'Story' }),
  ];

  it('hiddenRowTypes가 비어있으면 전체를 반환한다', () => {
    const result = filterByRowTypes(issues, new Set());
    expect(result).toHaveLength(3);
  });

  it('숨김 타입에 해당하는 이슈를 제외한다', () => {
    const result = filterByRowTypes(issues, new Set(['task', 'bug']));
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('P-3');
  });

  it('대소문자를 구분하지 않는다', () => {
    const result = filterByRowTypes(issues, new Set(['task', 'bug']));
    expect(result).toHaveLength(1);
    expect(result[0].issueType).toBe('Story');
  });
});

describe('이슈 타입 옵션 추출', () => {
  it('고유한 이슈 타입 목록을 추출한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', issueType: 'Task' }),
      makeIssue({ key: 'P-2', issueType: 'Bug' }),
      makeIssue({ key: 'P-3', issueType: 'Story' }),
    ];
    const result = extractIssueTypeOptions(issues);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.value).sort()).toEqual(['bug', 'story', 'task']);
  });

  it('value는 소문자, label은 원본 이름이다', () => {
    const issues = [makeIssue({ key: 'P-1', issueType: 'BugFix' })];
    const result = extractIssueTypeOptions(issues);
    expect(result[0].value).toBe('bugfix');
    expect(result[0].label).toBe('BugFix');
  });

  it('중복 타입은 제거한다', () => {
    const issues = [
      makeIssue({ key: 'P-1', issueType: 'Task' }),
      makeIssue({ key: 'P-2', issueType: 'Task' }),
      makeIssue({ key: 'P-3', issueType: 'Task' }),
    ];
    const result = extractIssueTypeOptions(issues);
    expect(result).toHaveLength(1);
  });

  it('빈 배열이면 빈 배열을 반환한다', () => {
    const result = extractIssueTypeOptions([]);
    expect(result).toHaveLength(0);
  });
});
