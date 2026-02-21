import { describe, it, expect } from 'vitest';
import type { NormalizedIssue } from '../src/main/schemas/storage.schema';
import { calcKRProgress, calcObjectiveProgress, buildOKRExportData } from '../src/renderer/utils/okr';

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

describe('KR 진행률 계산', () => {
  it('Jira 이슈 중 done 비율로 진행률을 계산한다', () => {
    const links = [
      { id: 'link1', keyResultId: 'kr1', type: 'jira' as const, issueKey: 'PROJ-1', order: 0 },
      { id: 'link2', keyResultId: 'kr1', type: 'jira' as const, issueKey: 'PROJ-2', order: 1 },
      { id: 'link3', keyResultId: 'kr1', type: 'jira' as const, issueKey: 'PROJ-3', order: 2 },
    ];
    const issueMap = new Map([
      ['PROJ-1', makeIssue({ key: 'PROJ-1', statusCategory: 'done' })],
      ['PROJ-2', makeIssue({ key: 'PROJ-2', statusCategory: 'done' })],
      ['PROJ-3', makeIssue({ key: 'PROJ-3', statusCategory: 'indeterminate' })],
    ]);

    expect(calcKRProgress('kr1', links as any, issueMap)).toBe(67);
  });

  it('모든 이슈가 done이면 100%이다', () => {
    const links = [
      { id: 'link1', keyResultId: 'kr1', type: 'jira' as const, issueKey: 'PROJ-1', order: 0 },
    ];
    const issueMap = new Map([
      ['PROJ-1', makeIssue({ key: 'PROJ-1', statusCategory: 'done' })],
    ]);

    expect(calcKRProgress('kr1', links as any, issueMap)).toBe(100);
  });

  it('연결된 Jira 이슈가 없으면 0%이다', () => {
    expect(calcKRProgress('kr1', [], new Map())).toBe(0);
  });

  it('가상 티켓은 진행률 계산에서 제외한다', () => {
    const links = [
      { id: 'link1', keyResultId: 'kr1', type: 'jira' as const, issueKey: 'PROJ-1', order: 0 },
      { id: 'link2', keyResultId: 'kr1', type: 'virtual' as const, order: 1 },
    ];
    const issueMap = new Map([
      ['PROJ-1', makeIssue({ key: 'PROJ-1', statusCategory: 'done' })],
    ]);

    expect(calcKRProgress('kr1', links as any, issueMap)).toBe(100);
  });

  it('다른 KR의 링크는 포함하지 않는다', () => {
    const links = [
      { id: 'link1', keyResultId: 'kr1', type: 'jira' as const, issueKey: 'PROJ-1', order: 0 },
      { id: 'link2', keyResultId: 'kr2', type: 'jira' as const, issueKey: 'PROJ-2', order: 1 },
    ];
    const issueMap = new Map([
      ['PROJ-1', makeIssue({ key: 'PROJ-1', statusCategory: 'new' })],
      ['PROJ-2', makeIssue({ key: 'PROJ-2', statusCategory: 'done' })],
    ]);

    expect(calcKRProgress('kr1', links as any, issueMap)).toBe(0);
  });
});

describe('Objective 진행률 계산', () => {
  it('하위 KR 진행률의 평균으로 계산한다', () => {
    const krs = [
      { id: 'kr1', objectiveId: 'o1', title: 'KR1', order: 0 },
      { id: 'kr2', objectiveId: 'o1', title: 'KR2', order: 1 },
    ];
    const links = [
      { id: 'link1', keyResultId: 'kr1', type: 'jira' as const, issueKey: 'PROJ-1', order: 0 },
      { id: 'link2', keyResultId: 'kr2', type: 'jira' as const, issueKey: 'PROJ-2', order: 1 },
    ];
    const issueMap = new Map([
      ['PROJ-1', makeIssue({ key: 'PROJ-1', statusCategory: 'done' })],  // kr1: 100%
      ['PROJ-2', makeIssue({ key: 'PROJ-2', statusCategory: 'new' })],   // kr2: 0%
    ]);

    expect(calcObjectiveProgress('o1', krs as any, links as any, issueMap)).toBe(50);
  });

  it('KR이 없으면 0%이다', () => {
    expect(calcObjectiveProgress('o1', [], [], new Map())).toBe(0);
  });

  it('다른 Objective의 KR은 포함하지 않는다', () => {
    const krs = [
      { id: 'kr1', objectiveId: 'o1', title: 'KR1', order: 0 },
      { id: 'kr2', objectiveId: 'o2', title: 'KR2', order: 1 },
    ];
    const links = [
      { id: 'link1', keyResultId: 'kr1', type: 'jira' as const, issueKey: 'PROJ-1', order: 0 },
      { id: 'link2', keyResultId: 'kr2', type: 'jira' as const, issueKey: 'PROJ-2', order: 1 },
    ];
    const issueMap = new Map([
      ['PROJ-1', makeIssue({ key: 'PROJ-1', statusCategory: 'done' })],
      ['PROJ-2', makeIssue({ key: 'PROJ-2', statusCategory: 'done' })],
    ]);

    expect(calcObjectiveProgress('o1', krs as any, links as any, issueMap)).toBe(100);
  });
});

describe('OKR 내보내기 데이터 생성', () => {
  it('objectives/keyResults/links 구조로 내보내기 데이터를 생성한다', () => {
    const okr = {
      objectives: [{ id: 'o1', title: 'Obj 1', description: 'desc', order: 0 }],
      keyResults: [{ id: 'kr1', objectiveId: 'o1', title: 'KR 1', description: null, order: 0 }],
      links: [{ id: 'l1', keyResultId: 'kr1', type: 'jira' as const, issueKey: 'PROJ-1', order: 0 }],
      relations: [],
      groups: [],
      virtualTickets: [],
    } as any;
    const issueMap = new Map([['PROJ-1', makeIssue({ key: 'PROJ-1' })]]);

    const result = buildOKRExportData(okr, issueMap) as any;
    expect(result.objectives).toHaveLength(1);
    expect(result.objectives[0].keyResults).toHaveLength(1);
    expect(result.objectives[0].keyResults[0].links).toHaveLength(1);
  });

  it('Jira 링크에 이슈 정보를 포함한다', () => {
    const okr = {
      objectives: [{ id: 'o1', title: 'Obj 1', description: null, order: 0 }],
      keyResults: [{ id: 'kr1', objectiveId: 'o1', title: 'KR 1', description: null, order: 0 }],
      links: [{ id: 'l1', keyResultId: 'kr1', type: 'jira' as const, issueKey: 'PROJ-1', order: 0 }],
      relations: [],
      groups: [],
      virtualTickets: [],
    } as any;
    const issueMap = new Map([
      [
        'PROJ-1',
        makeIssue({
          key: 'PROJ-1',
          summary: 'Test issue',
          status: 'In Progress',
          statusCategory: 'indeterminate',
          assignee: 'Alice',
          priority: 'High',
        }),
      ],
    ]);

    const result = buildOKRExportData(okr, issueMap) as any;
    const link = result.objectives[0].keyResults[0].links[0];
    expect(link.issueKey).toBe('PROJ-1');
    expect(link.summary).toBe('Test issue');
    expect(link.status).toBe('In Progress');
    expect(link.assignee).toBe('Alice');
  });

  it('가상 티켓 링크에 가상 티켓 정보를 포함한다', () => {
    const okr = {
      objectives: [{ id: 'o1', title: 'Obj 1', description: null, order: 0 }],
      keyResults: [{ id: 'kr1', objectiveId: 'o1', title: 'KR 1', description: null, order: 0 }],
      links: [{ id: 'l1', keyResultId: 'kr1', type: 'virtual' as const, virtualTicketId: 'vt1', order: 0 }],
      relations: [],
      groups: [],
      virtualTickets: [{ id: 'vt1', title: 'Virtual Task', description: 'Virtual desc', issueType: 'Task', assignee: 'Bob' }],
    } as any;

    const result = buildOKRExportData(okr, new Map()) as any;
    const link = result.objectives[0].keyResults[0].links[0];
    expect(link.virtualTicket).toBeDefined();
    expect(link.virtualTicket.title).toBe('Virtual Task');
    expect(link.virtualTicket.assignee).toBe('Bob');
  });

  it('exportedAt 타임스탬프를 포함한다', () => {
    const okr = {
      objectives: [],
      keyResults: [],
      links: [],
      relations: [],
      groups: [],
      virtualTickets: [],
    } as any;

    const result = buildOKRExportData(okr, new Map());
    expect(result.exportedAt).toBeDefined();
    expect(typeof result.exportedAt).toBe('string');
    // Should be ISO format
    expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
