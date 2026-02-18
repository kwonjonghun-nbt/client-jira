import { describe, it, expect } from 'vitest';
import {
  buildCanvasContext,
  buildCanvasPrompt,
  parseCanvasResponse,
  mergeCanvasChanges,
} from '../src/renderer/utils/ai-canvas';
import type {
  OKRData,
  OKRKeyResult,
  NormalizedIssue,
  CanvasChanges,
} from '../src/renderer/types/jira.types';

// ─── Test fixtures ──────────────────────────────────────────────────────────

function createBaseOKR(): OKRData {
  return {
    objectives: [{ id: 'obj-1', title: 'Objective 1', order: 0 }],
    keyResults: [{ id: 'kr-1', objectiveId: 'obj-1', title: 'KR 1', order: 0 }],
    virtualTickets: [
      { id: 'vt-1', title: '가상 티켓 1', issueType: 'task', createdAt: '2024-01-01' },
    ],
    links: [
      { id: 'link-1', keyResultId: 'kr-1', type: 'jira', issueKey: 'PROJ-1', order: 0, x: 0, y: 0 },
      { id: 'link-2', keyResultId: 'kr-1', type: 'jira', issueKey: 'PROJ-2', order: 1, x: 220, y: 0 },
      { id: 'link-3', keyResultId: 'kr-1', type: 'virtual', virtualTicketId: 'vt-1', order: 2, x: 0, y: 100 },
      // Link from another KR (should not be affected)
      { id: 'link-other', keyResultId: 'kr-other', type: 'jira', issueKey: 'OTHER-1', order: 0, x: 0, y: 0 },
    ],
    groups: [
      { id: 'group-1', keyResultId: 'kr-1', title: '프론트엔드', order: 0, x: 0, y: 200, w: 320, h: 200 },
    ],
    relations: [
      { id: 'rel-1', fromType: 'link', fromId: 'link-1', fromAnchor: 'bottom', toType: 'link', toId: 'link-2', toAnchor: 'top' },
    ],
    updatedAt: '2024-01-01',
  };
}

function createIssueMap(): Map<string, NormalizedIssue> {
  const map = new Map<string, NormalizedIssue>();
  map.set('PROJ-1', {
    key: 'PROJ-1',
    summary: '로그인 페이지 구현',
    status: 'In Progress',
    statusCategory: 'indeterminate',
    assignee: '김철수',
    reporter: null,
    priority: 'High',
    issueType: 'Story',
    storyPoints: 5,
    sprint: null,
    labels: [],
    components: [],
    created: '2024-01-01',
    updated: '2024-01-01',
    startDate: null,
    dueDate: null,
    resolution: null,
    timeTracking: null,
    parent: null,
    subtasks: [],
    issueLinks: [],
  });
  map.set('PROJ-2', {
    key: 'PROJ-2',
    summary: 'API 엔드포인트 개발',
    status: 'To Do',
    statusCategory: 'new',
    assignee: '박영희',
    reporter: null,
    priority: 'Medium',
    issueType: 'Task',
    storyPoints: 3,
    sprint: null,
    labels: [],
    components: [],
    created: '2024-01-01',
    updated: '2024-01-01',
    startDate: null,
    dueDate: null,
    resolution: null,
    timeTracking: null,
    parent: null,
    subtasks: [],
    issueLinks: [],
  });
  return map;
}

const kr: OKRKeyResult = { id: 'kr-1', objectiveId: 'obj-1', title: 'KR 1', order: 0 };

// ─── buildCanvasContext ─────────────────────────────────────────────────────

describe('buildCanvasContext', () => {
  it('현재 KR의 링크, 그룹, 관계만 추출한다', () => {
    const okr = createBaseOKR();
    const issueMap = createIssueMap();
    const ctx = buildCanvasContext(kr, okr, issueMap);

    expect(ctx.krTitle).toBe('KR 1');
    expect(ctx.links).toHaveLength(3); // link-1, link-2, link-3 (not link-other)
    expect(ctx.groups).toHaveLength(1);
    expect(ctx.relations).toHaveLength(1);
    expect(ctx.virtualTickets).toHaveLength(1);
  });

  it('Jira 이슈 정보를 링크에 포함한다', () => {
    const okr = createBaseOKR();
    const issueMap = createIssueMap();
    const ctx = buildCanvasContext(kr, okr, issueMap);

    const jiraLink = ctx.links.find((l) => l.issueKey === 'PROJ-1');
    expect(jiraLink?.title).toBe('로그인 페이지 구현');
    expect(jiraLink?.status).toBe('In Progress');
    expect(jiraLink?.assignee).toBe('김철수');
  });

  it('가상 티켓 정보를 링크에 포함한다', () => {
    const okr = createBaseOKR();
    const issueMap = createIssueMap();
    const ctx = buildCanvasContext(kr, okr, issueMap);

    const vtLink = ctx.links.find((l) => l.type === 'virtual');
    expect(vtLink?.title).toBe('가상 티켓 1');
  });
});

// ─── buildCanvasPrompt ──────────────────────────────────────────────────────

describe('buildCanvasPrompt', () => {
  it('시스템 프롬프트, 캔버스 상태, 사용자 프롬프트를 포함한다', () => {
    const okr = createBaseOKR();
    const issueMap = createIssueMap();
    const ctx = buildCanvasContext(kr, okr, issueMap);
    const prompt = buildCanvasPrompt('프론트엔드/백엔드로 그룹핑해줘', ctx);

    expect(prompt).toContain('canvas layout AI assistant');
    expect(prompt).toContain('CURRENT CANVAS STATE');
    expect(prompt).toContain('USER INSTRUCTION');
    expect(prompt).toContain('프론트엔드/백엔드로 그룹핑해줘');
    expect(prompt).toContain('PROJ-1');
  });
});

// ─── parseCanvasResponse ────────────────────────────────────────────────────

describe('parseCanvasResponse', () => {
  it('유효한 JSON을 파싱한다', () => {
    const raw = JSON.stringify({
      groups: [{ action: 'add', title: '백엔드', x: 0, y: 0, w: 320, h: 200 }],
      links: [{ action: 'update', id: 'link-1', groupId: 'new-group-1' }],
    });
    const result = parseCanvasResponse(raw);
    expect(result).not.toBeNull();
    expect(result!.groups).toHaveLength(1);
    expect(result!.links).toHaveLength(1);
  });

  it('마크다운 코드블록으로 감싸진 JSON을 파싱한다', () => {
    const raw = '```json\n{"groups": [{"action": "add", "title": "테스트"}]}\n```';
    const result = parseCanvasResponse(raw);
    expect(result).not.toBeNull();
    expect(result!.groups).toHaveLength(1);
  });

  it('JSON 앞뒤에 텍스트가 있어도 파싱한다', () => {
    const raw = 'Here is the result:\n{"relations": [{"action": "add", "fromId": "a", "toId": "b"}]}\nDone!';
    const result = parseCanvasResponse(raw);
    expect(result).not.toBeNull();
    expect(result!.relations).toHaveLength(1);
  });

  it('잘못된 JSON은 null을 반환한다', () => {
    expect(parseCanvasResponse('not json')).toBeNull();
    expect(parseCanvasResponse('')).toBeNull();
  });

  it('변경사항이 없으면 null을 반환한다', () => {
    const raw = JSON.stringify({ groups: [], links: [] });
    expect(parseCanvasResponse(raw)).toBeNull();
  });

  it('유효하지 않은 변경사항은 필터링한다', () => {
    const raw = JSON.stringify({
      groups: [
        { action: 'add', title: '유효' },
        { action: 'add' }, // title 없음 → 제외
        { action: 'unknown', id: 'x' }, // 잘못된 action → 제외
      ],
      links: [
        { action: 'update', id: 'link-1' },
        { action: 'update' }, // id 없음 → 제외
      ],
    });
    const result = parseCanvasResponse(raw);
    expect(result!.groups).toHaveLength(1);
    expect(result!.links).toHaveLength(1);
  });
});

// ─── mergeCanvasChanges ─────────────────────────────────────────────────────

describe('mergeCanvasChanges', () => {
  it('그룹을 추가한다', () => {
    const okr = createBaseOKR();
    const changes: CanvasChanges = {
      groups: [{ action: 'add', id: 'new-group-1', title: '백엔드', x: 400, y: 0, w: 320, h: 200 }],
    };
    const result = mergeCanvasChanges(okr, 'kr-1', changes);
    const newGroup = result.groups.find((g) => g.title === '백엔드');
    expect(newGroup).toBeDefined();
    expect(newGroup!.keyResultId).toBe('kr-1');
    expect(newGroup!.x).toBe(400);
  });

  it('그룹을 수정한다', () => {
    const okr = createBaseOKR();
    const changes: CanvasChanges = {
      groups: [{ action: 'update', id: 'group-1', title: 'Frontend' }],
    };
    const result = mergeCanvasChanges(okr, 'kr-1', changes);
    expect(result.groups.find((g) => g.id === 'group-1')!.title).toBe('Frontend');
  });

  it('그룹을 삭제한다', () => {
    const okr = createBaseOKR();
    const changes: CanvasChanges = {
      groups: [{ action: 'delete', id: 'group-1' }],
    };
    const result = mergeCanvasChanges(okr, 'kr-1', changes);
    expect(result.groups.find((g) => g.id === 'group-1')).toBeUndefined();
  });

  it('링크의 그룹 할당을 변경한다', () => {
    const okr = createBaseOKR();
    const changes: CanvasChanges = {
      groups: [{ action: 'add', id: 'new-group-1', title: '백엔드' }],
      links: [{ action: 'update', id: 'link-2', groupId: 'new-group-1' }],
    };
    const result = mergeCanvasChanges(okr, 'kr-1', changes);
    const newGroup = result.groups.find((g) => g.title === '백엔드');
    const link2 = result.links.find((l) => l.id === 'link-2');
    expect(link2!.groupId).toBe(newGroup!.id);
  });

  it('링크의 그룹을 해제한다 (groupId: null)', () => {
    const okr = createBaseOKR();
    // First put link-1 in a group
    okr.links = okr.links.map((l) =>
      l.id === 'link-1' ? { ...l, groupId: 'group-1' } : l,
    );
    const changes: CanvasChanges = {
      links: [{ action: 'update', id: 'link-1', groupId: null }],
    };
    const result = mergeCanvasChanges(okr, 'kr-1', changes);
    expect(result.links.find((l) => l.id === 'link-1')!.groupId).toBeUndefined();
  });

  it('관계를 추가한다', () => {
    const okr = createBaseOKR();
    const changes: CanvasChanges = {
      relations: [{ action: 'add', fromId: 'link-2', toId: 'link-3', fromAnchor: 'right', toAnchor: 'left', label: 'blocks' }],
    };
    const result = mergeCanvasChanges(okr, 'kr-1', changes);
    expect(result.relations).toHaveLength(2);
    const newRel = result.relations.find((r) => r.label === 'blocks');
    expect(newRel!.fromId).toBe('link-2');
    expect(newRel!.toId).toBe('link-3');
    expect(newRel!.fromAnchor).toBe('right');
    expect(newRel!.toAnchor).toBe('left');
  });

  it('관계를 삭제한다', () => {
    const okr = createBaseOKR();
    const changes: CanvasChanges = {
      relations: [{ action: 'delete', id: 'rel-1' }],
    };
    const result = mergeCanvasChanges(okr, 'kr-1', changes);
    expect(result.relations).toHaveLength(0);
  });

  it('가상 티켓을 추가하고 링크를 생성한다', () => {
    const okr = createBaseOKR();
    const changes: CanvasChanges = {
      virtualTickets: [{ action: 'add', title: '새 가상 티켓', issueType: 'story' }],
    };
    const result = mergeCanvasChanges(okr, 'kr-1', changes);
    expect(result.virtualTickets).toHaveLength(2);
    const newVT = result.virtualTickets.find((vt) => vt.title === '새 가상 티켓');
    expect(newVT).toBeDefined();
    // 링크도 자동 생성
    const vtLink = result.links.find((l) => l.virtualTicketId === newVT!.id);
    expect(vtLink).toBeDefined();
    expect(vtLink!.keyResultId).toBe('kr-1');
    expect(vtLink!.type).toBe('virtual');
  });

  it('다른 KR의 데이터를 보존한다', () => {
    const okr = createBaseOKR();
    const changes: CanvasChanges = {
      groups: [{ action: 'add', title: '새 그룹' }],
    };
    const result = mergeCanvasChanges(okr, 'kr-1', changes);
    // link-other from kr-other should be preserved
    expect(result.links.find((l) => l.id === 'link-other')).toBeDefined();
  });

  it('updatedAt을 갱신한다', () => {
    const okr = createBaseOKR();
    const changes: CanvasChanges = {
      groups: [{ action: 'add', title: '테스트' }],
    };
    const result = mergeCanvasChanges(okr, 'kr-1', changes);
    expect(result.updatedAt).not.toBe('2024-01-01');
  });

  it('tempId 매핑으로 새 그룹과 링크를 연결한다', () => {
    const okr = createBaseOKR();
    const changes: CanvasChanges = {
      groups: [
        { action: 'add', id: 'temp-1', title: 'AI 그룹' },
      ],
      links: [
        { action: 'update', id: 'link-1', groupId: 'temp-1' },
      ],
      virtualTickets: [
        { action: 'add', title: 'AI 가상 티켓', issueType: 'task', groupId: 'temp-1' },
      ],
    };
    const result = mergeCanvasChanges(okr, 'kr-1', changes);
    const aiGroup = result.groups.find((g) => g.title === 'AI 그룹');
    expect(aiGroup).toBeDefined();

    // link-1이 새 그룹에 할당됨
    const link1 = result.links.find((l) => l.id === 'link-1');
    expect(link1!.groupId).toBe(aiGroup!.id);

    // 가상 티켓 링크도 새 그룹에 할당됨
    const vtLink = result.links.find((l) => l.type === 'virtual' && l.groupId === aiGroup!.id);
    expect(vtLink).toBeDefined();
  });

  it('존재하지 않는 endpoint의 관계 추가는 무시한다', () => {
    const okr = createBaseOKR();
    const changes: CanvasChanges = {
      relations: [{ action: 'add', fromId: 'nonexistent-1', toId: 'nonexistent-2' }],
    };
    const result = mergeCanvasChanges(okr, 'kr-1', changes);
    // 기존 관계만 유지
    expect(result.relations).toHaveLength(1);
  });
});
