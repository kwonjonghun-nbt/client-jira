import {
  formatReportDate,
  extractAssignees,
  filterReportIssues,
  getDefaultPeriod,
  buildIssueExportData,
  buildReportPrompt,
  inlineFormat,
  renderMarkdown,
} from '@renderer/utils/reports';
import type { NormalizedIssue } from '@renderer/types/jira.types';

// 테스트용 이슈 팩토리
function createIssue(overrides: Partial<NormalizedIssue> = {}): NormalizedIssue {
  return {
    key: 'TEST-1',
    summary: '테스트 이슈',
    description: null,
    status: 'Done',
    statusCategory: 'done',
    assignee: '홍길동',
    reporter: null,
    priority: 'Medium',
    issueType: 'Task',
    storyPoints: null,
    sprint: null,
    labels: [],
    components: [],
    created: '2026-02-01T09:00:00.000+0900',
    updated: '2026-02-10T15:30:00.000+0900',
    startDate: null,
    dueDate: null,
    timeTracking: null,
    parent: null,
    subtasks: [],
    issueLinks: [],
    resolution: null,
    ...overrides,
  };
}

describe('formatReportDate', () => {
  it('ISO 날짜를 YYYY-MM-DD HH:MM 형식으로 변환한다', () => {
    const result = formatReportDate('2026-02-14T09:30:00.000Z');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('한 자리 월/일/시/분은 0으로 패딩한다', () => {
    const result = formatReportDate('2026-01-05T03:05:00.000Z');
    expect(result).toContain('-01-05');
    expect(result).toMatch(/\d{2}:\d{2}$/);
  });
});

describe('extractAssignees', () => {
  it('이슈 목록에서 고유한 담당자를 정렬하여 반환한다', () => {
    const issues = [
      createIssue({ assignee: '김철수' }),
      createIssue({ assignee: '이영희' }),
      createIssue({ assignee: '김철수' }),
    ];
    expect(extractAssignees(issues)).toEqual(['김철수', '이영희']);
  });

  it('null 담당자를 제외한다', () => {
    const issues = [createIssue({ assignee: null }), createIssue({ assignee: '홍길동' })];
    expect(extractAssignees(issues)).toEqual(['홍길동']);
  });

  it('빈 배열이면 빈 배열을 반환한다', () => {
    expect(extractAssignees([])).toEqual([]);
  });
});

describe('filterReportIssues', () => {
  const issues = [
    createIssue({ key: 'A-1', assignee: '김철수', updated: '2026-02-05T10:00:00.000+0900' }),
    createIssue({ key: 'A-2', assignee: '이영희', updated: '2026-02-10T10:00:00.000+0900' }),
    createIssue({ key: 'A-3', assignee: '김철수', updated: '2026-02-15T10:00:00.000+0900' }),
    createIssue({ key: 'A-4', assignee: '이영희', updated: '2026-02-20T10:00:00.000+0900' }),
  ];

  it('"전체" 담당자는 모든 이슈를 포함한다', () => {
    const result = filterReportIssues(issues, '전체', '2026-02-01', '2026-02-28');
    expect(result).toHaveLength(4);
  });

  it('특정 담당자로 필터링한다', () => {
    const result = filterReportIssues(issues, '김철수', '2026-02-01', '2026-02-28');
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.assignee === '김철수')).toBe(true);
  });

  it('기간으로 필터링한다 (경계값 포함)', () => {
    const result = filterReportIssues(issues, '전체', '2026-02-10', '2026-02-15');
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.key)).toEqual(['A-2', 'A-3']);
  });

  it('담당자 + 기간 복합 필터링', () => {
    const result = filterReportIssues(issues, '이영희', '2026-02-01', '2026-02-15');
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('A-2');
  });

  it('빈 배열이면 빈 배열을 반환한다', () => {
    expect(filterReportIssues([], '전체', '2026-02-01', '2026-02-28')).toEqual([]);
  });

  it('매칭되는 이슈가 없으면 빈 배열을 반환한다', () => {
    const result = filterReportIssues(issues, '박지민', '2026-02-01', '2026-02-28');
    expect(result).toEqual([]);
  });
});

describe('getDefaultPeriod', () => {
  it('start와 end를 YYYY-MM-DD 형식으로 반환한다', () => {
    const { start, end } = getDefaultPeriod();
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('start는 end보다 이전이다', () => {
    const { start, end } = getDefaultPeriod();
    expect(start < end).toBe(true);
  });
});

describe('buildIssueExportData', () => {
  it('이슈를 내보내기 형식으로 변환한다', () => {
    const issues = [createIssue({ key: 'EX-1', summary: '내보내기 테스트' })];
    const result = buildIssueExportData(issues);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('key', 'EX-1');
    expect(result[0]).toHaveProperty('summary', '내보내기 테스트');
    expect(result[0]).toHaveProperty('status');
    expect(result[0]).toHaveProperty('labels');
    expect(result[0]).toHaveProperty('components');
  });

  it('description이 null이면 null을 유지한다', () => {
    const issues = [createIssue({ description: null })];
    const result = buildIssueExportData(issues);
    expect(result[0].description).toBeNull();
  });

  it('빈 배열이면 빈 배열을 반환한다', () => {
    expect(buildIssueExportData([])).toEqual([]);
  });
});

describe('buildReportPrompt', () => {
  it('담당자, 시작일, 종료일을 프롬프트에 포함한다', () => {
    const result = buildReportPrompt('홍길동', '2026-02-01', '2026-02-14');
    expect(result).toContain('홍길동');
    expect(result).toContain('2026-02-01');
    expect(result).toContain('2026-02-14');
  });

  it('마크다운 형식의 프롬프트를 반환한다', () => {
    const result = buildReportPrompt('전체', '2026-02-01', '2026-02-14');
    expect(result).toContain('##');
    expect(result).toContain('마크다운');
  });
});

describe('inlineFormat', () => {
  it('**bold**를 <strong>으로 변환한다', () => {
    expect(inlineFormat('**굵게**')).toContain('<strong');
    expect(inlineFormat('**굵게**')).toContain('굵게');
  });

  it('`code`를 <code>로 변환한다', () => {
    expect(inlineFormat('`코드`')).toContain('<code');
    expect(inlineFormat('`코드`')).toContain('코드');
  });

  it('일반 텍스트는 변환하지 않는다', () => {
    expect(inlineFormat('일반 텍스트')).toBe('일반 텍스트');
  });
});

describe('renderMarkdown', () => {
  it('빈 문자열이면 빈 결과를 반환한다', () => {
    const result = renderMarkdown('');
    expect(result).toBeDefined();
  });

  it('frontmatter를 스킵한다', () => {
    const md = '---\ntitle: test\n---\n# 실제 내용';
    const result = renderMarkdown(md);
    expect(result).not.toContain('title: test');
    expect(result).toContain('실제 내용');
  });
});
