import { describe, it, expect } from 'vitest';
import { computeLabelStats, computeLabelStatsSummary } from '../src/renderer/utils/stats';
import type { NormalizedIssue } from '../src/renderer/types/jira.types';

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

describe('computeLabelStats', () => {
  it('기간 내 이슈의 라벨별 통계를 계산한다', () => {
    const issues = [
      makeIssue({
        key: 'PROJ-1',
        created: '2025-01-15T00:00:00Z',
        updated: '2025-01-20T00:00:00Z',
        statusCategory: 'done',
        labels: ['frontend'],
      }),
      makeIssue({
        key: 'PROJ-2',
        created: '2025-01-16T00:00:00Z',
        updated: '2025-01-21T00:00:00Z',
        statusCategory: 'done',
        labels: ['backend'],
      }),
    ];

    const result = computeLabelStats(issues, '2025-01-10', '2025-01-31');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      label: 'frontend',
      total: 1,
      completed: 1,
      incomplete: 0,
      rate: 100,
    });
    expect(result[1]).toEqual({
      label: 'backend',
      total: 1,
      completed: 1,
      incomplete: 0,
      rate: 100,
    });
  });

  it('라벨이 없는 이슈는 "(없음)" 라벨로 집계한다', () => {
    const issues = [
      makeIssue({
        key: 'PROJ-1',
        created: '2025-01-15T00:00:00Z',
        updated: '2025-01-20T00:00:00Z',
        statusCategory: 'done',
        labels: [],
      }),
    ];

    const result = computeLabelStats(issues, '2025-01-10', '2025-01-31');

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('(없음)');
    expect(result[0].total).toBe(1);
    expect(result[0].completed).toBe(1);
  });

  it('하나의 이슈에 여러 라벨이 있으면 각 라벨에 카운트한다', () => {
    const issues = [
      makeIssue({
        key: 'PROJ-1',
        created: '2025-01-15T00:00:00Z',
        updated: '2025-01-20T00:00:00Z',
        statusCategory: 'done',
        labels: ['frontend', 'urgent', 'bug'],
      }),
    ];

    const result = computeLabelStats(issues, '2025-01-10', '2025-01-31');

    expect(result).toHaveLength(3);
    const labels = result.map((s) => s.label).sort();
    expect(labels).toEqual(['bug', 'frontend', 'urgent']);
    result.forEach((stat) => {
      expect(stat.total).toBe(1);
      expect(stat.completed).toBe(1);
    });
  });

  it('기간 밖의 이슈는 제외한다 (created가 범위 밖)', () => {
    const issues = [
      makeIssue({
        key: 'PROJ-1',
        created: '2025-01-05T00:00:00Z', // 범위 밖
        updated: '2025-01-10T00:00:00Z',
        statusCategory: 'done',
        labels: ['frontend'],
      }),
      makeIssue({
        key: 'PROJ-2',
        created: '2025-02-05T00:00:00Z', // 범위 밖
        updated: '2025-02-10T00:00:00Z',
        statusCategory: 'done',
        labels: ['backend'],
      }),
      makeIssue({
        key: 'PROJ-3',
        created: '2025-01-15T00:00:00Z', // 범위 내
        updated: '2025-01-20T00:00:00Z',
        statusCategory: 'done',
        labels: ['api'],
      }),
    ];

    const result = computeLabelStats(issues, '2025-01-10', '2025-01-31');

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('api');
  });

  it('done 상태이고 updated가 기간 내면 completed로 카운트한다', () => {
    const issues = [
      makeIssue({
        key: 'PROJ-1',
        created: '2025-01-15T00:00:00Z',
        updated: '2025-01-20T00:00:00Z', // 기간 내
        statusCategory: 'done',
        labels: ['feature'],
      }),
    ];

    const result = computeLabelStats(issues, '2025-01-10', '2025-01-31');

    expect(result[0].completed).toBe(1);
    expect(result[0].incomplete).toBe(0);
  });

  it('done 상태여도 updated가 기간 밖이면 completed가 아니다', () => {
    const issues = [
      makeIssue({
        key: 'PROJ-1',
        created: '2025-01-15T00:00:00Z',
        updated: '2025-02-05T00:00:00Z', // 기간 밖
        statusCategory: 'done',
        labels: ['feature'],
      }),
    ];

    const result = computeLabelStats(issues, '2025-01-10', '2025-01-31');

    expect(result[0].total).toBe(1);
    expect(result[0].completed).toBe(0);
    expect(result[0].incomplete).toBe(1);
  });

  it('done이 아닌 상태는 completed로 카운트하지 않는다', () => {
    const issues = [
      makeIssue({
        key: 'PROJ-1',
        created: '2025-01-15T00:00:00Z',
        updated: '2025-01-20T00:00:00Z',
        statusCategory: 'in_progress', // done이 아님
        labels: ['feature'],
      }),
    ];

    const result = computeLabelStats(issues, '2025-01-10', '2025-01-31');

    expect(result[0].total).toBe(1);
    expect(result[0].completed).toBe(0);
    expect(result[0].incomplete).toBe(1);
  });

  it('total이 많은 순으로 정렬한다', () => {
    const issues = [
      makeIssue({
        key: 'PROJ-1',
        created: '2025-01-15T00:00:00Z',
        statusCategory: 'new',
        labels: ['z-label'],
      }),
      makeIssue({
        key: 'PROJ-2',
        created: '2025-01-15T00:00:00Z',
        statusCategory: 'new',
        labels: ['a-label'],
      }),
      makeIssue({
        key: 'PROJ-3',
        created: '2025-01-15T00:00:00Z',
        statusCategory: 'new',
        labels: ['a-label'],
      }),
      makeIssue({
        key: 'PROJ-4',
        created: '2025-01-15T00:00:00Z',
        statusCategory: 'new',
        labels: ['m-label'],
      }),
      makeIssue({
        key: 'PROJ-5',
        created: '2025-01-15T00:00:00Z',
        statusCategory: 'new',
        labels: ['m-label'],
      }),
      makeIssue({
        key: 'PROJ-6',
        created: '2025-01-15T00:00:00Z',
        statusCategory: 'new',
        labels: ['m-label'],
      }),
    ];

    const result = computeLabelStats(issues, '2025-01-10', '2025-01-31');

    expect(result[0].label).toBe('m-label');
    expect(result[0].total).toBe(3);
    expect(result[1].label).toBe('a-label');
    expect(result[1].total).toBe(2);
    expect(result[2].label).toBe('z-label');
    expect(result[2].total).toBe(1);
  });

  it('빈 이슈 배열이면 빈 배열을 반환한다', () => {
    const result = computeLabelStats([], '2025-01-10', '2025-01-31');

    expect(result).toEqual([]);
  });

  it('rate는 (completed / total) * 100으로 계산한다', () => {
    const issues = [
      makeIssue({
        key: 'PROJ-1',
        created: '2025-01-15T00:00:00Z',
        updated: '2025-01-20T00:00:00Z',
        statusCategory: 'done',
        labels: ['completed'],
      }),
      makeIssue({
        key: 'PROJ-2',
        created: '2025-01-15T00:00:00Z',
        updated: '2025-01-25T00:00:00Z', // 기간 내에 완료됨
        statusCategory: 'done',
        labels: ['partial'],
      }),
      makeIssue({
        key: 'PROJ-3',
        created: '2025-01-15T00:00:00Z',
        updated: '2025-01-25T00:00:00Z',
        statusCategory: 'in_progress',
        labels: ['partial'],
      }),
      makeIssue({
        key: 'PROJ-4',
        created: '2025-01-15T00:00:00Z',
        statusCategory: 'new',
        labels: ['incomplete'],
      }),
    ];

    const result = computeLabelStats(issues, '2025-01-10', '2025-01-31');

    const completed = result.find((s) => s.label === 'completed')!;
    expect(completed.rate).toBe(100);

    const partial = result.find((s) => s.label === 'partial')!;
    expect(partial.rate).toBe(50);

    const incomplete = result.find((s) => s.label === 'incomplete')!;
    expect(incomplete.rate).toBe(0);
  });

  it('incomplete은 total - completed이다', () => {
    const issues = [
      makeIssue({
        key: 'PROJ-1',
        created: '2025-01-15T00:00:00Z',
        updated: '2025-01-20T00:00:00Z',
        statusCategory: 'done',
        labels: ['status'],
      }),
      makeIssue({
        key: 'PROJ-2',
        created: '2025-01-15T00:00:00Z',
        statusCategory: 'in_progress',
        labels: ['status'],
      }),
      makeIssue({
        key: 'PROJ-3',
        created: '2025-01-15T00:00:00Z',
        statusCategory: 'new',
        labels: ['status'],
      }),
    ];

    const result = computeLabelStats(issues, '2025-01-10', '2025-01-31');

    expect(result[0].total).toBe(3);
    expect(result[0].completed).toBe(1);
    expect(result[0].incomplete).toBe(2);
  });

  it('startDate가 빈 문자열이면 0부터 시작한다', () => {
    const issues = [
      makeIssue({
        key: 'PROJ-1',
        created: '2025-01-01T00:00:00Z', // 매우 오래된 날짜
        updated: '2025-01-05T00:00:00Z',
        statusCategory: 'done',
        labels: ['old'],
      }),
    ];

    const result = computeLabelStats(issues, '', '2025-01-31');

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('old');
  });

  it('endDate가 빈 문자열이면 무한대까지 포함한다', () => {
    const issues = [
      makeIssue({
        key: 'PROJ-1',
        created: '2099-12-31T00:00:00Z', // 먼 미래
        updated: '2099-12-31T00:00:00Z',
        statusCategory: 'done',
        labels: ['future'],
      }),
    ];

    const result = computeLabelStats(issues, '2025-01-10', '');

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('future');
  });

  it('endDate는 23:59:59까지 포함한다', () => {
    const issues = [
      makeIssue({
        key: 'PROJ-1',
        created: '2025-01-31T12:00:00Z',
        updated: '2025-01-31T12:00:00Z',
        statusCategory: 'done',
        labels: ['edge'],
      }),
    ];

    const result = computeLabelStats(issues, '2025-01-10', '2025-01-31');

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('edge');
  });

  it('같은 라벨의 여러 이슈를 집계한다', () => {
    const issues = [
      makeIssue({
        key: 'PROJ-1',
        created: '2025-01-15T00:00:00Z',
        updated: '2025-01-20T00:00:00Z',
        statusCategory: 'done',
        labels: ['shared'],
      }),
      makeIssue({
        key: 'PROJ-2',
        created: '2025-01-16T00:00:00Z',
        updated: '2025-01-22T00:00:00Z', // 기간 내
        statusCategory: 'done',
        labels: ['shared'],
      }),
      makeIssue({
        key: 'PROJ-3',
        created: '2025-01-17T00:00:00Z',
        statusCategory: 'in_progress',
        labels: ['shared'],
      }),
    ];

    const result = computeLabelStats(issues, '2025-01-10', '2025-01-31');

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('shared');
    expect(result[0].total).toBe(3);
    expect(result[0].completed).toBe(2);
    expect(result[0].incomplete).toBe(1);
  });

  it('복잡한 다중 라벨 시나리오를 처리한다', () => {
    const issues = [
      makeIssue({
        key: 'PROJ-1',
        created: '2025-01-15T00:00:00Z',
        updated: '2025-01-20T00:00:00Z',
        statusCategory: 'done',
        labels: ['frontend', 'urgent'],
      }),
      makeIssue({
        key: 'PROJ-2',
        created: '2025-01-15T00:00:00Z',
        updated: '2025-01-25T00:00:00Z',
        statusCategory: 'in_progress',
        labels: ['frontend', 'bug'],
      }),
      makeIssue({
        key: 'PROJ-3',
        created: '2025-01-15T00:00:00Z',
        updated: '2025-01-20T00:00:00Z',
        statusCategory: 'done',
        labels: ['backend'],
      }),
    ];

    const result = computeLabelStats(issues, '2025-01-10', '2025-01-31');

    const frontend = result.find((s) => s.label === 'frontend')!;
    expect(frontend.total).toBe(2);
    expect(frontend.completed).toBe(1);
    expect(frontend.rate).toBe(50);

    const urgent = result.find((s) => s.label === 'urgent')!;
    expect(urgent.total).toBe(1);
    expect(urgent.completed).toBe(1);

    const bug = result.find((s) => s.label === 'bug')!;
    expect(bug.total).toBe(1);
    expect(bug.completed).toBe(0);

    const backend = result.find((s) => s.label === 'backend')!;
    expect(backend.total).toBe(1);
    expect(backend.completed).toBe(1);
  });
});

describe('computeLabelStatsSummary', () => {
  it('라벨 통계의 요약을 반환한다', () => {
    const labelStats = [
      {
        label: 'frontend',
        total: 5,
        completed: 3,
        incomplete: 2,
        rate: 60,
      },
      {
        label: 'backend',
        total: 4,
        completed: 2,
        incomplete: 2,
        rate: 50,
      },
      {
        label: 'docs',
        total: 2,
        completed: 2,
        incomplete: 0,
        rate: 100,
      },
    ];

    const result = computeLabelStatsSummary(labelStats);

    expect(result).toEqual({
      labelCount: 3,
      totalIssues: 11,
      totalCompleted: 7,
    });
  });

  it('빈 배열이면 모든 값이 0이다', () => {
    const result = computeLabelStatsSummary([]);

    expect(result).toEqual({
      labelCount: 0,
      totalIssues: 0,
      totalCompleted: 0,
    });
  });

  it('한 개의 라벨만 있어도 정상 작동한다', () => {
    const labelStats = [
      {
        label: 'single',
        total: 10,
        completed: 5,
        incomplete: 5,
        rate: 50,
      },
    ];

    const result = computeLabelStatsSummary(labelStats);

    expect(result).toEqual({
      labelCount: 1,
      totalIssues: 10,
      totalCompleted: 5,
    });
  });

  it('모두 완료된 라벨들을 정확히 집계한다', () => {
    const labelStats = [
      {
        label: 'done-label-1',
        total: 3,
        completed: 3,
        incomplete: 0,
        rate: 100,
      },
      {
        label: 'done-label-2',
        total: 5,
        completed: 5,
        incomplete: 0,
        rate: 100,
      },
    ];

    const result = computeLabelStatsSummary(labelStats);

    expect(result.labelCount).toBe(2);
    expect(result.totalIssues).toBe(8);
    expect(result.totalCompleted).toBe(8);
  });

  it('모두 미완료된 라벨들을 정확히 집계한다', () => {
    const labelStats = [
      {
        label: 'pending-1',
        total: 4,
        completed: 0,
        incomplete: 4,
        rate: 0,
      },
      {
        label: 'pending-2',
        total: 6,
        completed: 0,
        incomplete: 6,
        rate: 0,
      },
    ];

    const result = computeLabelStatsSummary(labelStats);

    expect(result.labelCount).toBe(2);
    expect(result.totalIssues).toBe(10);
    expect(result.totalCompleted).toBe(0);
  });

  it('큰 숫자들을 올바르게 합산한다', () => {
    const labelStats = [
      {
        label: 'large-1',
        total: 1000,
        completed: 750,
        incomplete: 250,
        rate: 75,
      },
      {
        label: 'large-2',
        total: 2000,
        completed: 1500,
        incomplete: 500,
        rate: 75,
      },
      {
        label: 'large-3',
        total: 500,
        completed: 250,
        incomplete: 250,
        rate: 50,
      },
    ];

    const result = computeLabelStatsSummary(labelStats);

    expect(result.labelCount).toBe(3);
    expect(result.totalIssues).toBe(3500);
    expect(result.totalCompleted).toBe(2500);
  });

  it('computeLabelStats의 결과를 처리한다', () => {
    const issues = [
      makeIssue({
        key: 'PROJ-1',
        created: '2025-01-15T00:00:00Z',
        updated: '2025-01-20T00:00:00Z',
        statusCategory: 'done',
        labels: ['feature'],
      }),
      makeIssue({
        key: 'PROJ-2',
        created: '2025-01-15T00:00:00Z',
        statusCategory: 'in_progress',
        labels: ['feature'],
      }),
      makeIssue({
        key: 'PROJ-3',
        created: '2025-01-15T00:00:00Z',
        statusCategory: 'new',
        labels: ['bug'],
      }),
    ];

    const labelStats = computeLabelStats(issues, '2025-01-10', '2025-01-31');
    const summary = computeLabelStatsSummary(labelStats);

    expect(summary.labelCount).toBe(2);
    expect(summary.totalIssues).toBe(3);
    expect(summary.totalCompleted).toBe(1);
  });
});
