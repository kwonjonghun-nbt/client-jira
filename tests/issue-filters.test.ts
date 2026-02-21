import { describe, it, expect } from 'vitest';
import type { NormalizedIssue } from '../src/main/schemas/storage.schema';
import { applyFilters, extractFilterOptions } from '../src/renderer/utils/issue-filters';

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

describe('이슈 필터 로직', () => {
  const issues = [
    makeIssue({ key: 'PROJ-1', status: 'To Do', assignee: 'Alice', summary: '로그인 구현' }),
    makeIssue({ key: 'PROJ-2', status: 'In Progress', assignee: 'Bob', summary: '대시보드 개선' }),
    makeIssue({ key: 'PROJ-3', status: 'Done', assignee: 'Alice', summary: '버그 수정' }),
    makeIssue({ key: 'OTHER-1', status: 'To Do', assignee: null, summary: '기타 작업' }),
  ];

  it('프로젝트 필터로 특정 프로젝트의 이슈만 표시한다', () => {
    const result = applyFilters(issues, { project: 'PROJ', statuses: [], assignee: '', search: '' });
    expect(result).toHaveLength(3);
    expect(result.every((i) => i.key.startsWith('PROJ-'))).toBe(true);
  });

  it('상태 필터로 특정 상태의 이슈만 표시한다', () => {
    const result = applyFilters(issues, { project: '', statuses: ['To Do'], assignee: '', search: '' });
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.status === 'To Do')).toBe(true);
  });

  it('여러 상태를 동시에 필터링한다', () => {
    const result = applyFilters(issues, { project: '', statuses: ['To Do', 'Done'], assignee: '', search: '' });
    expect(result).toHaveLength(3);
  });

  it('담당자 필터로 특정 담당자의 이슈만 표시한다', () => {
    const result = applyFilters(issues, { project: '', statuses: [], assignee: 'Alice', search: '' });
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.assignee === 'Alice')).toBe(true);
  });

  it('텍스트 검색으로 키를 검색한다', () => {
    const result = applyFilters(issues, { project: '', statuses: [], assignee: '', search: 'OTHER' });
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('OTHER-1');
  });

  it('텍스트 검색으로 요약(summary)을 검색한다', () => {
    const result = applyFilters(issues, { project: '', statuses: [], assignee: '', search: '로그인' });
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('PROJ-1');
  });

  it('텍스트 검색은 대소문자를 무시한다', () => {
    const result = applyFilters(issues, { project: '', statuses: [], assignee: '', search: 'proj' });
    expect(result).toHaveLength(3);
  });

  it('모든 필터를 복합 적용한다 (AND 조건)', () => {
    const result = applyFilters(issues, {
      project: 'PROJ',
      statuses: ['To Do'],
      assignee: 'Alice',
      search: '로그인',
    });
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('PROJ-1');
  });

  it('필터 조건이 모두 비어있으면 전체를 반환한다', () => {
    const result = applyFilters(issues, { project: '', statuses: [], assignee: '', search: '' });
    expect(result).toHaveLength(4);
  });

  it('조건에 맞는 이슈가 없으면 빈 배열을 반환한다', () => {
    const result = applyFilters(issues, { project: '', statuses: [], assignee: '', search: '없는검색어' });
    expect(result).toHaveLength(0);
  });
});

describe('필터 옵션 추출', () => {
  const issues = [
    makeIssue({ key: 'PROJ-1', status: 'To Do', assignee: 'Alice' }),
    makeIssue({ key: 'PROJ-2', status: 'In Progress', assignee: 'Bob' }),
    makeIssue({ key: 'OTHER-1', status: 'To Do', assignee: null }),
  ];

  it('프로젝트 목록을 추출한다', () => {
    const { projects } = extractFilterOptions(issues);
    expect(projects).toEqual(['OTHER', 'PROJ']);
  });

  it('상태 목록을 추출한다', () => {
    const { statuses } = extractFilterOptions(issues);
    expect(statuses).toEqual(['In Progress', 'To Do']);
  });

  it('담당자 목록을 추출한다 (null 제외)', () => {
    const { assignees } = extractFilterOptions(issues);
    expect(assignees).toEqual(['Alice', 'Bob']);
  });

  it('빈 이슈 배열이면 빈 옵션을 반환한다', () => {
    const { projects, statuses, assignees } = extractFilterOptions([]);
    expect(projects).toEqual([]);
    expect(statuses).toEqual([]);
    expect(assignees).toEqual([]);
  });
});
