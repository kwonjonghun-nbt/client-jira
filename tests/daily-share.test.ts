import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NormalizedIssue } from '../src/renderer/types/jira.types';
import {
  categorizeDailyIssues,
  buildDailyShareMarkdown,
  buildMultiAssigneeDailyShareMarkdown,
  buildDailyShareExportData,
  buildDailySharePrompt,
  DailyShareCategories,
} from '../src/renderer/utils/daily-share';

/**
 * Helper to create a NormalizedIssue with defaults
 */
function makeIssue(overrides: Partial<NormalizedIssue> & { key: string }): NormalizedIssue {
  return {
    summary: 'Test issue',
    description: null,
    status: 'In Progress',
    statusCategory: 'indeterminate',
    assignee: 'Alice',
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

describe('daily-share.ts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 2025-06-15 09:00:00 UTC로 고정
    // today = '2025-06-15', tomorrow = '2025-06-16'
    vi.setSystemTime(new Date('2025-06-15T09:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('categorizeDailyIssues', () => {
    it('진행중(indeterminate) 이슈를 inProgress로 분류한다', () => {
      const issues = [
        makeIssue({
          key: 'JIRA-1',
          statusCategory: 'indeterminate',
          status: 'In Progress',
        }),
      ];

      const result = categorizeDailyIssues(issues, '전체');

      expect(result.inProgress).toHaveLength(1);
      expect(result.inProgress[0].key).toBe('JIRA-1');
      expect(result.dueToday).toHaveLength(0);
      expect(result.overdue).toHaveLength(0);
      expect(result.atRisk).toHaveLength(0);
    });

    it('오늘 마감인 미완료 이슈를 dueToday로 분류한다', () => {
      const issues = [
        makeIssue({
          key: 'JIRA-2',
          statusCategory: 'todo',
          dueDate: '2025-06-15',
        }),
      ];

      const result = categorizeDailyIssues(issues, '전체');

      expect(result.dueToday).toHaveLength(1);
      expect(result.dueToday[0].key).toBe('JIRA-2');
      expect(result.inProgress).toHaveLength(0);
      expect(result.overdue).toHaveLength(0);
      expect(result.atRisk).toHaveLength(0);
    });

    it('마감일이 지난 미완료 이슈를 overdue로 분류한다', () => {
      const issues = [
        makeIssue({
          key: 'JIRA-3',
          statusCategory: 'todo',
          dueDate: '2025-06-10',
        }),
      ];

      const result = categorizeDailyIssues(issues, '전체');

      expect(result.overdue).toHaveLength(1);
      expect(result.overdue[0].key).toBe('JIRA-3');
      expect(result.inProgress).toHaveLength(0);
      expect(result.dueToday).toHaveLength(0);
      expect(result.atRisk).toHaveLength(0);
    });

    it('내일 마감이고 리뷰 단계가 아닌 이슈를 atRisk로 분류한다', () => {
      const issues = [
        makeIssue({
          key: 'JIRA-4',
          statusCategory: 'indeterminate',
          status: 'In Progress',
          dueDate: '2025-06-16',
        }),
      ];

      const result = categorizeDailyIssues(issues, '전체');

      expect(result.atRisk).toHaveLength(1);
      expect(result.atRisk[0].key).toBe('JIRA-4');
    });

    it('내일 마감이지만 리뷰 중인 이슈는 atRisk에 포함하지 않는다', () => {
      const issues = [
        makeIssue({
          key: 'JIRA-5a',
          statusCategory: 'indeterminate',
          status: 'In Review',
          dueDate: '2025-06-16',
        }),
        makeIssue({
          key: 'JIRA-5b',
          statusCategory: 'indeterminate',
          status: '리뷰 진행중',
          dueDate: '2025-06-16',
        }),
        makeIssue({
          key: 'JIRA-5c',
          statusCategory: 'indeterminate',
          status: 'QA 테스트',
          dueDate: '2025-06-16',
        }),
      ];

      const result = categorizeDailyIssues(issues, '전체');

      expect(result.atRisk).toHaveLength(0);
    });

    it('완료(done) 이슈는 날짜 기반 분류에서 제외한다', () => {
      const issues = [
        makeIssue({
          key: 'JIRA-6',
          statusCategory: 'done',
          status: 'Done',
          dueDate: '2025-06-15',
        }),
      ];

      const result = categorizeDailyIssues(issues, '전체');

      expect(result.inProgress).toHaveLength(0);
      expect(result.dueToday).toHaveLength(0);
      expect(result.overdue).toHaveLength(0);
      expect(result.atRisk).toHaveLength(0);
    });

    it('담당자 필터가 전체이면 모든 이슈를 포함한다', () => {
      const issues = [
        makeIssue({
          key: 'JIRA-7a',
          assignee: 'Alice',
          statusCategory: 'indeterminate',
        }),
        makeIssue({
          key: 'JIRA-7b',
          assignee: 'Bob',
          statusCategory: 'indeterminate',
        }),
      ];

      const result = categorizeDailyIssues(issues, '전체');

      expect(result.inProgress).toHaveLength(2);
    });

    it('특정 담당자로 필터링하면 해당 담당자 이슈만 포함한다', () => {
      const issues = [
        makeIssue({
          key: 'JIRA-8a',
          assignee: 'Alice',
          statusCategory: 'indeterminate',
        }),
        makeIssue({
          key: 'JIRA-8b',
          assignee: 'Bob',
          statusCategory: 'indeterminate',
        }),
      ];

      const result = categorizeDailyIssues(issues, 'Alice');

      expect(result.inProgress).toHaveLength(1);
      expect(result.inProgress[0].assignee).toBe('Alice');
    });

    it('하나의 이슈가 여러 카테고리에 포함될 수 있다', () => {
      const issues = [
        makeIssue({
          key: 'JIRA-9',
          statusCategory: 'indeterminate',
          status: 'In Progress',
          dueDate: '2025-06-15',
        }),
      ];

      const result = categorizeDailyIssues(issues, '전체');

      // inProgress와 dueToday 모두에 포함
      expect(result.inProgress).toHaveLength(1);
      expect(result.dueToday).toHaveLength(1);
      expect(result.inProgress[0].key).toBe('JIRA-9');
      expect(result.dueToday[0].key).toBe('JIRA-9');
    });

    it('dueDate가 null인 이슈는 날짜 기반 분류에서 제외한다', () => {
      const issues = [
        makeIssue({
          key: 'JIRA-10',
          statusCategory: 'todo',
          dueDate: null,
        }),
      ];

      const result = categorizeDailyIssues(issues, '전체');

      expect(result.dueToday).toHaveLength(0);
      expect(result.overdue).toHaveLength(0);
      expect(result.atRisk).toHaveLength(0);
    });

    it('dueDate가 정확한 YYYY-MM-DD 형식이 아니어도 처리한다', () => {
      const issues = [
        makeIssue({
          key: 'JIRA-11',
          statusCategory: 'todo',
          dueDate: '2025-06-15T00:00:00Z',
        }),
      ];

      const result = categorizeDailyIssues(issues, '전체');

      // dueDate의 처음 10자만 사용하므로 '2025-06-15'로 정규화됨
      expect(result.dueToday).toHaveLength(1);
    });
  });

  describe('buildDailyShareMarkdown', () => {
    it('마크다운 형식의 리포트를 생성한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailyShareMarkdown('Alice', categories);

      expect(result).toContain('# ');
      expect(result).toContain('## ');
    });

    it('모든 섹션 제목을 포함한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailyShareMarkdown('Alice', categories);

      expect(result).toContain('## 진행 현황');
      expect(result).toContain('## 오늘 완료 예정');
      expect(result).toContain('## 지연 이슈');
      expect(result).toContain('## 리스크 이슈');
      expect(result).toContain('## 요약');
    });

    it('지연 이슈에 지연 일수를 표시한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [],
        dueToday: [],
        overdue: [
          makeIssue({
            key: 'JIRA-12',
            summary: 'Delayed task',
            dueDate: '2025-06-10',
            statusCategory: 'todo',
          }),
        ],
        atRisk: [],
      };

      const result = buildDailyShareMarkdown('Alice', categories);

      expect(result).toContain('5일 지연');
    });

    it('이슈가 없는 카테고리는 없습니다 메시지를 포함한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailyShareMarkdown('Alice', categories);

      expect(result).toContain('현재 진행중인 작업은 없습니다.');
      expect(result).toContain('오늘 마감 예정인 작업은 없습니다.');
      expect(result).toContain('지연된 작업은 없습니다.');
      expect(result).toContain('주의가 필요한 리스크 이슈는 없습니다.');
    });

    it('담당자가 전체일 때 전체 팀원으로 표시한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailyShareMarkdown('전체', categories);

      expect(result).toContain('# 전체 팀원 일일 이슈 공유');
    });

    it('특정 담당자일 때 이름으로 표시한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailyShareMarkdown('Alice', categories);

      expect(result).toContain('# Alice 일일 이슈 공유');
    });

    it('진행 현황 섹션에 이슈 개수를 표시한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [
          makeIssue({ key: 'JIRA-13a', statusCategory: 'indeterminate' }),
          makeIssue({ key: 'JIRA-13b', statusCategory: 'indeterminate' }),
        ],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailyShareMarkdown('Alice', categories);

      expect(result).toContain('현재 **2건**의 작업을 진행하고 있습니다.');
    });

    it('이슈 상세 정보를 포함한다 (key, summary, priority, status)', () => {
      const categories: DailyShareCategories = {
        inProgress: [
          makeIssue({
            key: 'JIRA-14',
            summary: 'Important task',
            status: 'In Progress',
            priority: 'High',
            storyPoints: 5,
            statusCategory: 'indeterminate',
          }),
        ],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailyShareMarkdown('Alice', categories);

      expect(result).toContain('**JIRA-14**');
      expect(result).toContain('Important task');
      expect(result).toContain('우선순위 High');
      expect(result).toContain('(5SP)');
      expect(result).toContain('현재 상태: In Progress');
    });

    it('요약 섹션에 전체 이슈 개수를 계산한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [makeIssue({ key: 'JIRA-15a', statusCategory: 'indeterminate' })],
        dueToday: [makeIssue({ key: 'JIRA-15b', statusCategory: 'todo', dueDate: '2025-06-15' })],
        overdue: [makeIssue({ key: 'JIRA-15c', statusCategory: 'todo', dueDate: '2025-06-10' })],
        atRisk: [],
      };

      const result = buildDailyShareMarkdown('Alice', categories);

      expect(result).toContain('총 **3건**의 관련 이슈가 있습니다.');
      expect(result).toContain('진행중 1건, 오늘 마감 1건, 지연 1건, 리스크 0건입니다.');
    });

    it('지연 이슈가 있을 때 확인 필요 메시지를 포함한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [],
        dueToday: [],
        overdue: [makeIssue({ key: 'JIRA-16', statusCategory: 'todo', dueDate: '2025-06-10' })],
        atRisk: [],
      };

      const result = buildDailyShareMarkdown('Alice', categories);

      expect(result).toContain('특히 지연 이슈 **1건**에 대한 확인이 필요합니다.');
    });

    it('리스크 이슈가 있을 때 리뷰 진입 필요 메시지를 포함한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [],
        dueToday: [],
        overdue: [],
        atRisk: [
          makeIssue({
            key: 'JIRA-17',
            statusCategory: 'indeterminate',
            dueDate: '2025-06-16',
          }),
        ],
      };

      const result = buildDailyShareMarkdown('Alice', categories);

      expect(result).toContain('리스크 이슈 **1건**은 내일 마감이므로 우선적으로 리뷰 진입이 필요합니다.');
    });

    it('오늘 날짜를 포함한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailyShareMarkdown('Alice', categories);

      expect(result).toContain('2025-06-15 기준');
    });

    it('storyPoints가 null일 때 표시하지 않는다', () => {
      const categories: DailyShareCategories = {
        inProgress: [
          makeIssue({
            key: 'JIRA-18',
            summary: 'Task without SP',
            status: 'In Progress',
            storyPoints: null,
            statusCategory: 'indeterminate',
          }),
        ],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailyShareMarkdown('Alice', categories);

      expect(result).toContain('Task without SP');
      expect(result).not.toContain('(null');
    });

    it('priority가 null일 때 표시하지 않는다', () => {
      const categories: DailyShareCategories = {
        inProgress: [
          makeIssue({
            key: 'JIRA-19',
            summary: 'Task without priority',
            status: 'In Progress',
            priority: null,
            statusCategory: 'indeterminate',
          }),
        ],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailyShareMarkdown('Alice', categories);

      expect(result).toContain('Task without priority');
      expect(result).not.toContain('우선순위 null');
    });
  });

  describe('buildMultiAssigneeDailyShareMarkdown', () => {
    it('여러 담당자의 마크다운을 합산한다', () => {
      const issues = [
        makeIssue({
          key: 'JIRA-20a',
          assignee: 'Alice',
          statusCategory: 'indeterminate',
        }),
        makeIssue({
          key: 'JIRA-20b',
          assignee: 'Bob',
          statusCategory: 'indeterminate',
        }),
      ];

      const result = buildMultiAssigneeDailyShareMarkdown(issues, ['Alice', 'Bob']);

      expect(result).toContain('# Alice 일일 이슈 공유');
      expect(result).toContain('# Bob 일일 이슈 공유');
    });

    it('담당자 사이에 구분선을 넣는다', () => {
      const issues = [
        makeIssue({
          key: 'JIRA-21a',
          assignee: 'Alice',
          statusCategory: 'indeterminate',
        }),
        makeIssue({
          key: 'JIRA-21b',
          assignee: 'Bob',
          statusCategory: 'indeterminate',
        }),
      ];

      const result = buildMultiAssigneeDailyShareMarkdown(issues, ['Alice', 'Bob']);

      expect(result).toContain('---');
    });

    it('이슈가 없는 담당자는 제외한다', () => {
      const issues = [
        makeIssue({
          key: 'JIRA-22a',
          assignee: 'Alice',
          statusCategory: 'indeterminate',
        }),
      ];

      const result = buildMultiAssigneeDailyShareMarkdown(issues, ['Alice', 'Bob']);

      expect(result).toContain('# Alice 일일 이슈 공유');
      expect(result).not.toContain('# Bob 일일 이슈 공유');
    });

    it('담당자 순서를 유지한다', () => {
      const issues = [
        makeIssue({
          key: 'JIRA-23a',
          assignee: 'Charlie',
          statusCategory: 'indeterminate',
        }),
        makeIssue({
          key: 'JIRA-23b',
          assignee: 'Alice',
          statusCategory: 'indeterminate',
        }),
      ];

      const result = buildMultiAssigneeDailyShareMarkdown(issues, ['Alice', 'Bob', 'Charlie']);

      const aliceIndex = result.indexOf('# Alice 일일 이슈 공유');
      const charlieIndex = result.indexOf('# Charlie 일일 이슈 공유');

      expect(aliceIndex).toBeLessThan(charlieIndex);
    });
  });

  describe('buildDailyShareExportData', () => {
    it('이슈의 핵심 필드를 모두 포함하는 내보내기 데이터를 생성한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [
          makeIssue({
            key: 'JIRA-25',
            summary: 'Test summary',
            status: 'In Progress',
            statusCategory: 'indeterminate',
            priority: 'High',
            issueType: 'Bug',
            storyPoints: 8,
            dueDate: '2025-06-20',
            assignee: 'Charlie',
          }),
        ],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailyShareExportData(categories);
      const exported = result.inProgress[0] as any;

      expect(exported).toMatchObject({
        key: 'JIRA-25',
        summary: 'Test summary',
        status: 'In Progress',
        statusCategory: 'indeterminate',
        priority: 'High',
        issueType: 'Bug',
        storyPoints: 8,
        dueDate: '2025-06-20',
        assignee: 'Charlie',
      });
    });

    it('모든 카테고리를 변환한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [makeIssue({ key: 'JIRA-34a', statusCategory: 'indeterminate' })],
        dueToday: [makeIssue({ key: 'JIRA-34b', statusCategory: 'todo', dueDate: '2025-06-15' })],
        overdue: [makeIssue({ key: 'JIRA-34c', statusCategory: 'todo', dueDate: '2025-06-10' })],
        atRisk: [
          makeIssue({
            key: 'JIRA-34d',
            statusCategory: 'indeterminate',
            dueDate: '2025-06-16',
          }),
        ],
      };

      const result = buildDailyShareExportData(categories);

      expect(result.inProgress).toHaveLength(1);
      expect(result.dueToday).toHaveLength(1);
      expect(result.overdue).toHaveLength(1);
      expect(result.atRisk).toHaveLength(1);
    });
  });

  describe('buildDailySharePrompt', () => {
    it('AI 프롬프트를 생성한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailySharePrompt('Alice', categories);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('오늘 날짜를 포함한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailySharePrompt('Alice', categories);

      expect(result).toContain('2025-06-15');
    });

    it('담당자가 전체일 때 전체 팀원으로 표시한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailySharePrompt('전체', categories);

      expect(result).toContain('전체 팀원');
    });

    it('특정 담당자일 때 이름으로 표시한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailySharePrompt('Alice', categories);

      expect(result).toContain('Alice');
      expect(result).not.toContain('전체 팀원');
    });

    it('각 카테고리별 이슈 개수를 포함한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [makeIssue({ key: 'JIRA-35a', statusCategory: 'indeterminate' })],
        dueToday: [makeIssue({ key: 'JIRA-35b', statusCategory: 'todo', dueDate: '2025-06-15' })],
        overdue: [makeIssue({ key: 'JIRA-35c', statusCategory: 'todo', dueDate: '2025-06-10' })],
        atRisk: [
          makeIssue({
            key: 'JIRA-35d',
            statusCategory: 'indeterminate',
            dueDate: '2025-06-16',
          }),
        ],
      };

      const result = buildDailySharePrompt('Alice', categories);

      expect(result).toContain('(1건)');
    });

    it('이슈 데이터를 JSON 형식으로 포함한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [
          makeIssue({
            key: 'JIRA-36',
            summary: 'Test issue',
            status: 'In Progress',
            statusCategory: 'indeterminate',
          }),
        ],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailySharePrompt('Alice', categories);

      expect(result).toContain('JIRA-36');
      expect(result).toContain('Test issue');
    });

    it('마크다운 형식 지침을 포함한다', () => {
      const categories: DailyShareCategories = {
        inProgress: [],
        dueToday: [],
        overdue: [],
        atRisk: [],
      };

      const result = buildDailySharePrompt('Alice', categories);

      expect(result).toContain('마크다운');
      expect(result).toContain('## 섹션 제목');
    });
  });
});
