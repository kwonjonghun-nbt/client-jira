import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NormalizedIssue } from '../src/main/schemas/storage.schema';
import { formatRelativeTime, formatDateSafe, formatDateShort, formatDate, formatDateTime, formatDuration } from '../src/renderer/utils/formatters';

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

describe('상대 시간 표시', () => {
  const FIXED_NOW = new Date('2025-06-15T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('방금 전을 표시한다', () => {
    expect(formatRelativeTime('2025-06-15T12:00:00Z')).toBe('방금 전');
  });

  it('N분 전을 표시한다', () => {
    expect(formatRelativeTime('2025-06-15T11:50:00Z')).toBe('10분 전');
  });

  it('N시간 전을 표시한다', () => {
    expect(formatRelativeTime('2025-06-15T09:00:00Z')).toBe('3시간 전');
  });

  it('N일 전을 표시한다', () => {
    expect(formatRelativeTime('2025-06-10T12:00:00Z')).toBe('5일 전');
  });

  it('N개월 전을 표시한다', () => {
    expect(formatRelativeTime('2025-04-11T12:00:00Z')).toBe('2개월 전');
  });
});

describe('날짜 포맷 유틸', () => {
  it('formatDateSafe는 null이면 "-"를 반환한다', () => {
    expect(formatDateSafe(null)).toBe('-');
  });

  it('formatDateSafe는 날짜 문자열을 포맷한다', () => {
    const result = formatDateSafe('2025-01-15T00:00:00Z');
    expect(result).toContain('2025');
    expect(result).toContain('01');
    expect(result).toContain('15');
  });

  it('formatDateShort는 null이면 "-"를 반환한다', () => {
    expect(formatDateShort(null)).toBe('-');
  });

  it('formatDateShort는 월/일만 표시한다', () => {
    const result = formatDateShort('2025-06-15T00:00:00Z');
    // Should NOT contain year
    expect(result).not.toContain('2025');
  });
});

describe('날짜 포맷 (formatDate)', () => {
  it('날짜를 한국어 형식으로 포맷한다', () => {
    const result = formatDate('2025-01-15T00:00:00Z');
    expect(result).toContain('2025');
    expect(result).toContain('01');
    expect(result).toContain('15');
  });
});

describe('날짜시간 포맷 (formatDateTime)', () => {
  it('날짜와 시간을 포맷한다', () => {
    const result = formatDateTime('2025-01-15T14:30:00Z');
    expect(result).toContain('2025');
    expect(result).toContain('01');
    expect(result).toContain('15');
    // Time parts should be present
    expect(result.match(/\d+:\d+/)).toBeTruthy();
  });
});

describe('소요시간 포맷 (formatDuration)', () => {
  it('1초 미만은 ms로 표시한다', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('60초 미만은 초로 표시한다', () => {
    expect(formatDuration(1000)).toBe('1초');
    expect(formatDuration(30000)).toBe('30초');
    expect(formatDuration(59000)).toBe('59초');
  });

  it('60초 이상은 분과 초로 표시한다', () => {
    expect(formatDuration(60000)).toContain('분');
    expect(formatDuration(90000)).toBe('1분 30초');
    expect(formatDuration(125000)).toBe('2분 5초');
  });
});
