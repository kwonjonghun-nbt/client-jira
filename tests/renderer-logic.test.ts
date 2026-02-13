import { describe, it, expect } from 'vitest';
import type { NormalizedIssue } from '../src/main/schemas/storage.schema';
import { normalizeType, statusBadgeClass, getPriorityColor, getIssueTypeLabel, buildIssueUrl } from '../src/renderer/utils/issue';
import { formatRelativeTime, formatDateSafe, formatDateShort } from '../src/renderer/utils/formatters';
import { applyFilters, extractFilterOptions } from '../src/renderer/utils/issue-filters';
import { getDescriptionTemplate, buildPrompt } from '../src/renderer/utils/issue-prompts';

// ─── Filter logic (pure function equivalent of useFilters) ──────────────────

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

// ─── KR Progress calculation ────────────────────────────────────────────────

interface OKRLink {
  keyResultId: string;
  type: 'jira' | 'virtual';
  issueKey?: string;
}

function calcKRProgress(
  krId: string,
  links: OKRLink[],
  issueMap: Map<string, { statusCategory: string }>,
): number {
  const krLinks = links.filter((l) => l.keyResultId === krId && l.type === 'jira');
  if (krLinks.length === 0) return 0;
  const doneCount = krLinks.filter((l) => {
    const issue = issueMap.get(l.issueKey!);
    return issue?.statusCategory === 'done';
  }).length;
  return Math.round((doneCount / krLinks.length) * 100);
}

function calcObjectiveProgress(
  objectiveId: string,
  keyResults: Array<{ id: string; objectiveId: string }>,
  links: OKRLink[],
  issueMap: Map<string, { statusCategory: string }>,
): number {
  const krs = keyResults.filter((kr) => kr.objectiveId === objectiveId);
  if (krs.length === 0) return 0;
  const total = krs.reduce(
    (sum, kr) => sum + calcKRProgress(kr.id, links, issueMap),
    0,
  );
  return Math.round(total / krs.length);
}

describe('KR 진행률 계산', () => {
  it('Jira 이슈 중 done 비율로 진행률을 계산한다', () => {
    const links: OKRLink[] = [
      { keyResultId: 'kr1', type: 'jira', issueKey: 'PROJ-1' },
      { keyResultId: 'kr1', type: 'jira', issueKey: 'PROJ-2' },
      { keyResultId: 'kr1', type: 'jira', issueKey: 'PROJ-3' },
    ];
    const issueMap = new Map([
      ['PROJ-1', { statusCategory: 'done' }],
      ['PROJ-2', { statusCategory: 'done' }],
      ['PROJ-3', { statusCategory: 'indeterminate' }],
    ]);

    expect(calcKRProgress('kr1', links, issueMap)).toBe(67);
  });

  it('모든 이슈가 done이면 100%이다', () => {
    const links: OKRLink[] = [
      { keyResultId: 'kr1', type: 'jira', issueKey: 'PROJ-1' },
    ];
    const issueMap = new Map([
      ['PROJ-1', { statusCategory: 'done' }],
    ]);

    expect(calcKRProgress('kr1', links, issueMap)).toBe(100);
  });

  it('연결된 Jira 이슈가 없으면 0%이다', () => {
    expect(calcKRProgress('kr1', [], new Map())).toBe(0);
  });

  it('가상 티켓은 진행률 계산에서 제외한다', () => {
    const links: OKRLink[] = [
      { keyResultId: 'kr1', type: 'jira', issueKey: 'PROJ-1' },
      { keyResultId: 'kr1', type: 'virtual' },
    ];
    const issueMap = new Map([
      ['PROJ-1', { statusCategory: 'done' }],
    ]);

    expect(calcKRProgress('kr1', links, issueMap)).toBe(100);
  });

  it('다른 KR의 링크는 포함하지 않는다', () => {
    const links: OKRLink[] = [
      { keyResultId: 'kr1', type: 'jira', issueKey: 'PROJ-1' },
      { keyResultId: 'kr2', type: 'jira', issueKey: 'PROJ-2' },
    ];
    const issueMap = new Map([
      ['PROJ-1', { statusCategory: 'new' }],
      ['PROJ-2', { statusCategory: 'done' }],
    ]);

    expect(calcKRProgress('kr1', links, issueMap)).toBe(0);
  });
});

describe('Objective 진행률 계산', () => {
  it('하위 KR 진행률의 평균으로 계산한다', () => {
    const krs = [
      { id: 'kr1', objectiveId: 'o1' },
      { id: 'kr2', objectiveId: 'o1' },
    ];
    const links: OKRLink[] = [
      { keyResultId: 'kr1', type: 'jira', issueKey: 'PROJ-1' },
      { keyResultId: 'kr2', type: 'jira', issueKey: 'PROJ-2' },
    ];
    const issueMap = new Map([
      ['PROJ-1', { statusCategory: 'done' }],  // kr1: 100%
      ['PROJ-2', { statusCategory: 'new' }],   // kr2: 0%
    ]);

    expect(calcObjectiveProgress('o1', krs, links, issueMap)).toBe(50);
  });

  it('KR이 없으면 0%이다', () => {
    expect(calcObjectiveProgress('o1', [], [], new Map())).toBe(0);
  });

  it('다른 Objective의 KR은 포함하지 않는다', () => {
    const krs = [
      { id: 'kr1', objectiveId: 'o1' },
      { id: 'kr2', objectiveId: 'o2' },
    ];
    const links: OKRLink[] = [
      { keyResultId: 'kr1', type: 'jira', issueKey: 'PROJ-1' },
      { keyResultId: 'kr2', type: 'jira', issueKey: 'PROJ-2' },
    ];
    const issueMap = new Map([
      ['PROJ-1', { statusCategory: 'done' }],
      ['PROJ-2', { statusCategory: 'done' }],
    ]);

    expect(calcObjectiveProgress('o1', krs, links, issueMap)).toBe(100);
  });
});

// ─── Dashboard helpers ──────────────────────────────────────────────────────

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

describe('상대 시간 표시', () => {
  it('방금 전을 표시한다', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('방금 전');
  });

  it('N분 전을 표시한다', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60000).toISOString();
    expect(formatRelativeTime(tenMinAgo)).toBe('10분 전');
  });

  it('N시간 전을 표시한다', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('3시간 전');
  });

  it('N일 전을 표시한다', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(formatRelativeTime(fiveDaysAgo)).toBe('5일 전');
  });

  it('N개월 전을 표시한다', () => {
    const twoMonthsAgo = new Date(Date.now() - 65 * 86400000).toISOString();
    expect(formatRelativeTime(twoMonthsAgo)).toBe('2개월 전');
  });
});

// ─── Date range filter logic ────────────────────────────────────────────────

describe('기간 필터 로직', () => {
  function filterByDateRange(
    issues: NormalizedIssue[],
    dateStart: string,
    dateEnd: string,
  ): NormalizedIssue[] {
    if (!dateStart && !dateEnd) return issues;
    const startMs = dateStart ? new Date(dateStart).getTime() : 0;
    const endMs = dateEnd ? new Date(dateEnd + 'T23:59:59').getTime() : Infinity;

    return issues.filter((issue) => {
      const createdMs = new Date(issue.created).getTime();
      const dueMs = issue.dueDate ? new Date(issue.dueDate).getTime() : null;
      const createdInRange = createdMs >= startMs && createdMs <= endMs;
      const dueInRange = dueMs !== null && dueMs >= startMs && dueMs <= endMs;
      const spansRange = dueMs !== null && createdMs <= startMs && dueMs >= endMs;
      return createdInRange || dueInRange || spansRange;
    });
  }

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

// ─── Status badge class ─────────────────────────────────────────────────────

describe('상태 배지 스타일', () => {
  it('done 상태는 녹색 배지를 반환한다', () => {
    expect(statusBadgeClass('done')).toContain('green');
  });

  it('indeterminate 상태는 파란 배지를 반환한다', () => {
    expect(statusBadgeClass('indeterminate')).toContain('blue');
  });

  it('new 상태는 회색 배지를 반환한다', () => {
    expect(statusBadgeClass('new')).toContain('gray');
  });

  it('알 수 없는 상태는 회색 배지를 반환한다', () => {
    expect(statusBadgeClass('unknown')).toContain('gray');
  });
});

// ─── Priority color ─────────────────────────────────────────────────────────

describe('우선순위 색상', () => {
  it('각 우선순위에 해당하는 색상을 반환한다', () => {
    expect(getPriorityColor('Highest')).toContain('red');
    expect(getPriorityColor('High')).toContain('orange');
    expect(getPriorityColor('Medium')).toContain('yellow');
    expect(getPriorityColor('Low')).toContain('blue');
    expect(getPriorityColor('Lowest')).toContain('gray');
  });

  it('null이면 기본 회색을 반환한다', () => {
    expect(getPriorityColor(null)).toContain('gray');
  });

  it('알 수 없는 우선순위는 기본 회색을 반환한다', () => {
    expect(getPriorityColor('Unknown')).toContain('gray');
  });
});

// ─── Issue type label ───────────────────────────────────────────────────────

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

// ─── Issue URL builder ──────────────────────────────────────────────────────

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

// ─── Date formatters ────────────────────────────────────────────────────────

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

// ─── Prompt builder ─────────────────────────────────────────────────────────

describe('프롬프트 생성', () => {
  it('getDescriptionTemplate는 bug 타입에 맞는 템플릿을 반환한다', () => {
    const template = getDescriptionTemplate('Bug');
    expect(template).toContain('현상');
    expect(template).toContain('재현 순서');
    expect(template).toContain('완료 조건');
  });

  it('getDescriptionTemplate는 epic 타입에 맞는 템플릿을 반환한다', () => {
    const template = getDescriptionTemplate('Epic');
    expect(template).toContain('목표');
    expect(template).toContain('범위');
    expect(template).toContain('성공 기준');
  });

  it('getDescriptionTemplate는 task 타입에 맞는 템플릿을 반환한다', () => {
    const template = getDescriptionTemplate('Task');
    expect(template).toContain('목적');
    expect(template).toContain('작업 내용');
  });

  it('getDescriptionTemplate는 sub-task 타입에 맞는 템플릿을 반환한다', () => {
    const template = getDescriptionTemplate('Sub-Task');
    expect(template).toContain('작업 내용');
    expect(template).toContain('완료 조건');
  });

  it('getDescriptionTemplate는 story를 기본 템플릿으로 반환한다', () => {
    const template = getDescriptionTemplate('Story');
    expect(template).toContain('배경');
    expect(template).toContain('요구사항');
  });

  it('buildPrompt는 이슈 정보가 포함된 프롬프트를 생성한다', () => {
    const issue = makeIssue({
      key: 'PROJ-1',
      summary: '테스트 이슈',
      issueType: 'Task',
      status: 'In Progress',
      statusCategory: 'indeterminate',
      priority: 'High',
      assignee: 'Alice',
    });
    const prompt = buildPrompt(issue);
    expect(prompt).toContain('PROJ-1');
    expect(prompt).toContain('테스트 이슈');
    expect(prompt).toContain('Task');
    expect(prompt).toContain('In Progress');
    expect(prompt).toContain('High');
    expect(prompt).toContain('Alice');
    expect(prompt).toContain('라벨 정의');
    expect(prompt).toContain('요청사항');
  });

  it('buildPrompt는 description이 없으면 "(설명 없음)"을 포함한다', () => {
    const issue = makeIssue({ key: 'PROJ-2', description: null });
    const prompt = buildPrompt(issue);
    expect(prompt).toContain('(설명 없음)');
  });

  it('buildPrompt는 선택적 필드가 있을 때 포함한다', () => {
    const issue = makeIssue({
      key: 'PROJ-3',
      sprint: 'Sprint 5',
      labels: ['FE-Feature', 'FE-Stability'],
      components: ['web-app'],
      parent: 'PROJ-1',
      subtasks: ['PROJ-4', 'PROJ-5'],
      dueDate: '2025-03-01',
    });
    const prompt = buildPrompt(issue);
    expect(prompt).toContain('Sprint 5');
    expect(prompt).toContain('FE-Feature, FE-Stability');
    expect(prompt).toContain('web-app');
    expect(prompt).toContain('PROJ-1');
    expect(prompt).toContain('PROJ-4, PROJ-5');
    expect(prompt).toContain('2025-03-01');
  });
});
