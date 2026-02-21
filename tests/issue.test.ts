import { describe, it, expect } from 'vitest';
import type { NormalizedIssue } from '../src/main/schemas/storage.schema';
import { normalizeType, getIssueTypeLabel, buildIssueUrl, statusBadgeClass, getPriorityColor } from '../src/renderer/utils/issue';

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

describe('이슈타입 정규화', () => {
  it('영문 타입을 정규화한다', () => {
    expect(normalizeType('Epic')).toBe('epic');
    expect(normalizeType('Story')).toBe('story');
    expect(normalizeType('Task')).toBe('task');
    expect(normalizeType('Bug')).toBe('bug');
    expect(normalizeType('Sub-Task')).toBe('sub-task');
  });

  it('한글 타입을 정규화한다', () => {
    expect(normalizeType('에픽')).toBe('epic');
    expect(normalizeType('스토리')).toBe('story');
    expect(normalizeType('새기능')).toBe('story');
    expect(normalizeType('새 기능')).toBe('story');
    expect(normalizeType('작업')).toBe('task');
    expect(normalizeType('하위작업')).toBe('sub-task');
    expect(normalizeType('하위 작업')).toBe('sub-task');
    expect(normalizeType('버그')).toBe('bug');
  });

  it('알 수 없는 타입은 task로 기본값 처리한다', () => {
    expect(normalizeType('unknown')).toBe('task');
    expect(normalizeType('custom-type')).toBe('task');
  });
});

describe('이슈 타입 라벨', () => {
  it('정규화된 타입의 한글 라벨을 반환한다', () => {
    expect(getIssueTypeLabel('epic', 'Epic')).toBe('에픽');
    expect(getIssueTypeLabel('story', 'Story')).toBe('스토리');
    expect(getIssueTypeLabel('task', 'Task')).toBe('작업');
    expect(getIssueTypeLabel('sub-task', 'Sub-task')).toBe('하위작업');
    expect(getIssueTypeLabel('bug', 'Bug')).toBe('버그');
  });

  it('알 수 없는 타입은 fallback을 반환한다', () => {
    expect(getIssueTypeLabel('unknown', 'Custom Type')).toBe('Custom Type');
  });
});

describe('이슈 URL 생성', () => {
  it('baseUrl과 이슈 키로 URL을 생성한다', () => {
    expect(buildIssueUrl('https://jira.example.com', 'PROJ-1')).toBe('https://jira.example.com/browse/PROJ-1');
  });

  it('baseUrl 끝의 슬래시를 제거한다', () => {
    expect(buildIssueUrl('https://jira.example.com/', 'PROJ-1')).toBe('https://jira.example.com/browse/PROJ-1');
    expect(buildIssueUrl('https://jira.example.com///', 'PROJ-1')).toBe('https://jira.example.com/browse/PROJ-1');
  });

  it('baseUrl이 없으면 null을 반환한다', () => {
    expect(buildIssueUrl(null, 'PROJ-1')).toBeNull();
    expect(buildIssueUrl(undefined, 'PROJ-1')).toBeNull();
  });
});

describe('statusBadgeClass', () => {
  it('done → green 클래스', () => {
    expect(statusBadgeClass('done')).toBe('bg-green-100 text-green-700');
  });

  it('indeterminate → blue 클래스', () => {
    expect(statusBadgeClass('indeterminate')).toBe('bg-blue-100 text-blue-700');
  });

  it('new → gray 기본 클래스', () => {
    expect(statusBadgeClass('new')).toBe('bg-gray-100 text-gray-700');
  });

  it('알 수 없는 카테고리 → gray 기본 클래스', () => {
    expect(statusBadgeClass('unknown-category')).toBe('bg-gray-100 text-gray-700');
  });
});

describe('getPriorityColor', () => {
  it('Highest → text-red-600', () => {
    expect(getPriorityColor('Highest')).toBe('text-red-600');
  });

  it('High → text-orange-500', () => {
    expect(getPriorityColor('High')).toBe('text-orange-500');
  });

  it('Medium → text-yellow-500', () => {
    expect(getPriorityColor('Medium')).toBe('text-yellow-500');
  });

  it('Low → text-blue-500', () => {
    expect(getPriorityColor('Low')).toBe('text-blue-500');
  });

  it('Lowest → text-gray-400', () => {
    expect(getPriorityColor('Lowest')).toBe('text-gray-400');
  });

  it('null → text-gray-400', () => {
    expect(getPriorityColor(null)).toBe('text-gray-400');
  });

  it('알 수 없는 우선순위 → text-gray-400', () => {
    expect(getPriorityColor('Critical')).toBe('text-gray-400');
  });
});
