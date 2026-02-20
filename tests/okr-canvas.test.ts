import { describe, it, expect } from 'vitest';
import {
  rectsOverlap,
  assignDefaultPosition,
  CARD_W,
  CARD_H,
  AREA_PAD,
  GAP,
  GROUP_HEADER_H,
  toAbsoluteCoords,
  toLocalCoords,
  type Rect,
} from '../src/renderer/hooks/okr/okr-canvas.types';
import {
  computeUnlinkWork,
  computeDeleteVirtualTicket,
  computeDeleteGroup,
  calcDragPosition,
  hitTestGroup,
} from '../src/renderer/utils/okr-canvas-operations';
import type { OKRLink, OKRRelation, OKRGroup, VirtualTicket } from '../src/renderer/types/jira.types';

// ─── rectsOverlap ───────────────────────────────────────────────────────────

describe('rectsOverlap', () => {
  it('겹치는 사각형을 감지한다', () => {
    const a: Rect = { x: 0, y: 0, w: 100, h: 100 };
    const b: Rect = { x: 50, y: 50, w: 100, h: 100 };
    expect(rectsOverlap(a, b)).toBe(true);
  });

  it('겹치지 않는 사각형을 감지한다 (오른쪽)', () => {
    const a: Rect = { x: 0, y: 0, w: 100, h: 100 };
    const b: Rect = { x: 200, y: 0, w: 100, h: 100 };
    expect(rectsOverlap(a, b)).toBe(false);
  });

  it('겹치지 않는 사각형을 감지한다 (아래)', () => {
    const a: Rect = { x: 0, y: 0, w: 100, h: 100 };
    const b: Rect = { x: 0, y: 200, w: 100, h: 100 };
    expect(rectsOverlap(a, b)).toBe(false);
  });

  it('맞닿은 사각형은 겹치지 않는 것으로 판단한다', () => {
    const a: Rect = { x: 0, y: 0, w: 100, h: 100 };
    const b: Rect = { x: 100, y: 0, w: 100, h: 100 };
    expect(rectsOverlap(a, b)).toBe(false);
  });

  it('완전히 포함된 사각형을 겹침으로 감지한다', () => {
    const outer: Rect = { x: 0, y: 0, w: 200, h: 200 };
    const inner: Rect = { x: 50, y: 50, w: 50, h: 50 };
    expect(rectsOverlap(outer, inner)).toBe(true);
  });
});

// ─── assignDefaultPosition ──────────────────────────────────────────────────

describe('assignDefaultPosition', () => {
  it('빈 캔버스에서 첫 번째 위치에 배치한다', () => {
    const pos = assignDefaultPosition([], CARD_W, CARD_H, 800);
    expect(pos).toEqual({ x: AREA_PAD, y: AREA_PAD });
  });

  it('기존 카드 옆에 배치한다', () => {
    const occupied: Rect[] = [
      { x: AREA_PAD, y: AREA_PAD, w: CARD_W, h: CARD_H },
    ];

    const pos = assignDefaultPosition(occupied, CARD_W, CARD_H, 800);

    expect(pos.x).toBe(AREA_PAD + CARD_W + GAP);
    expect(pos.y).toBe(AREA_PAD);
  });

  it('행이 가득 차면 다음 행에 배치한다', () => {
    const cols = Math.max(1, Math.floor((800 - AREA_PAD * 2) / (CARD_W + GAP)));
    const occupied: Rect[] = [];
    for (let col = 0; col < cols; col++) {
      occupied.push({
        x: AREA_PAD + col * (CARD_W + GAP),
        y: AREA_PAD,
        w: CARD_W,
        h: CARD_H,
      });
    }

    const pos = assignDefaultPosition(occupied, CARD_W, CARD_H, 800);

    expect(pos.x).toBe(AREA_PAD);
    expect(pos.y).toBe(AREA_PAD + CARD_H + GAP);
  });

  it('기존 요소와 겹치지 않는 위치를 찾는다', () => {
    const occupied: Rect[] = [
      { x: AREA_PAD, y: AREA_PAD, w: CARD_W, h: CARD_H },
      { x: AREA_PAD + CARD_W + GAP, y: AREA_PAD, w: CARD_W, h: CARD_H },
    ];

    const pos = assignDefaultPosition(occupied, CARD_W, CARD_H, 800);

    const candidate: Rect = { x: pos.x, y: pos.y, w: CARD_W, h: CARD_H };
    for (const o of occupied) {
      expect(rectsOverlap(candidate, o)).toBe(false);
    }
  });

  it('그룹과도 겹치지 않게 배치한다', () => {
    const occupied: Rect[] = [
      { x: AREA_PAD, y: AREA_PAD, w: 320, h: 200 },
    ];

    const pos = assignDefaultPosition(occupied, CARD_W, CARD_H, 800);
    const candidate: Rect = { x: pos.x, y: pos.y, w: CARD_W, h: CARD_H };

    expect(rectsOverlap(candidate, occupied[0])).toBe(false);
  });
});

// ─── Drag coordinate logic ──────────────────────────────────────────────────

describe('드래그 좌표 계산 로직', () => {
  it('비그룹 카드는 캔버스 원점(0,0) 이하로 이동하지 않는다', () => {
    const pos = calcDragPosition(10, 10, -100, -100);
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);
  });

  it('비그룹 카드는 양수 방향으로 자유롭게 이동한다', () => {
    const pos = calcDragPosition(10, 10, 50, 50);
    expect(pos.x).toBe(60);
    expect(pos.y).toBe(60);
  });

  it('그룹 내 카드는 음수 좌표를 허용한다 (그룹 밖으로 이동)', () => {
    const pos = calcDragPosition(10, 10, -100, -100, 'group-1');
    expect(pos.x).toBe(-90);
    expect(pos.y).toBe(-90);
  });

  it('그룹 내 카드는 왼쪽/위쪽으로 자유롭게 이동한다', () => {
    const pos = calcDragPosition(0, 0, -50, -30, 'group-1');
    expect(pos.x).toBe(-50);
    expect(pos.y).toBe(-30);
  });

  it('그룹 역시 캔버스 원점 이하로 이동하지 않는다', () => {
    const pos = calcDragPosition(50, 50, -200, -200);
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);
  });
});

// ─── Group membership hit-test logic ────────────────────────────────────────

describe('그룹 멤버십 히트테스트 로직', () => {
  const group: OKRGroup = {
    id: 'g1', keyResultId: 'kr1', title: 'Group 1', order: 0,
    x: 100, y: 100, w: 320, h: 200,
  };

  it('카드 중심이 그룹 카드 영역 안에 있으면 그룹 id를 반환한다', () => {
    const result = hitTestGroup(200, 150, CARD_W, CARD_H, [group]);
    expect(result).toBe('g1');
  });

  it('카드 중심이 그룹 헤더 영역에 있으면 매칭하지 않는다', () => {
    const result = hitTestGroup(200, 50, CARD_W, CARD_H, [group]);
    expect(result).toBeUndefined();
  });

  it('카드 중심이 그룹 밖에 있으면 undefined를 반환한다', () => {
    const result = hitTestGroup(500, 500, CARD_W, CARD_H, [group]);
    expect(result).toBeUndefined();
  });

  it('여러 그룹 중 첫 번째 매칭 그룹을 반환한다', () => {
    const groups: OKRGroup[] = [
      { id: 'g1', keyResultId: 'kr1', title: 'G1', order: 0, x: 0, y: 0, w: 300, h: 200 },
      { id: 'g2', keyResultId: 'kr1', title: 'G2', order: 1, x: 0, y: 0, w: 400, h: 300 },
    ];
    const result = hitTestGroup(50, 50, CARD_W, CARD_H, groups);
    expect(result).toBe('g1');
  });

  it('빈 그룹 배열이면 undefined를 반환한다', () => {
    const result = hitTestGroup(100, 100, CARD_W, CARD_H, []);
    expect(result).toBeUndefined();
  });
});

// ─── Canvas-absolute ↔ Group-relative coordinate conversion ─────────────────

describe('좌표 변환 로직', () => {
  const groups = [
    { id: 'g1', x: 100, y: 100 },
  ];

  it('toLocalCoords: canvas-absolute → group-relative 변환', () => {
    const result = toLocalCoords(250, 280, 'g1', groups);

    // group origin in absolute = (100, 100 + GROUP_HEADER_H) = (100, 136)
    // relative = (250 - 100, 280 - 136) = (150, 144)
    expect(result.x).toBe(150);
    expect(result.y).toBe(144);
  });

  it('toAbsoluteCoords: group-relative → canvas-absolute 변환', () => {
    const result = toAbsoluteCoords(50, 30, 'g1', groups);

    // absolute = (50 + 100, 30 + 100 + GROUP_HEADER_H) = (150, 166)
    expect(result.x).toBe(150);
    expect(result.y).toBe(166);
  });
});

// ─── OKR data operations ────────────────────────────────────────────────────

describe('OKR 데이터 조작 로직', () => {
  // Helper to create minimal OKRRelation
  function makeRelation(overrides: Partial<OKRRelation> & { id: string }): OKRRelation {
    return {
      fromType: 'link', fromId: '', fromAnchor: 'right',
      toType: 'link', toId: '', toAnchor: 'left',
      ...overrides,
    };
  }

  describe('computeUnlinkWork', () => {
    it('Jira 링크를 해제한다', () => {
      const data = {
        links: [{ id: 'l1', keyResultId: 'kr1', type: 'jira' as const, issueKey: 'PROJ-1', order: 0 }],
        virtualTickets: [] as VirtualTicket[],
        relations: [] as OKRRelation[],
      };

      const result = computeUnlinkWork(data, 'l1');
      expect(result.links).toHaveLength(0);
    });

    it('가상 티켓 링크 해제 시 고아 가상 티켓을 함께 삭제한다', () => {
      const data = {
        links: [{ id: 'l1', keyResultId: 'kr1', type: 'virtual' as const, virtualTicketId: 'vt1', order: 0 }],
        virtualTickets: [{ id: 'vt1', title: 'VT', issueType: 'Task', createdAt: '2025-01-01' }] as VirtualTicket[],
        relations: [] as OKRRelation[],
      };

      const result = computeUnlinkWork(data, 'l1');
      expect(result.links).toHaveLength(0);
      expect(result.virtualTickets).toHaveLength(0);
    });

    it('가상 티켓이 다른 링크에서도 참조 중이면 삭제하지 않는다', () => {
      const data = {
        links: [
          { id: 'l1', keyResultId: 'kr1', type: 'virtual' as const, virtualTicketId: 'vt1', order: 0 },
          { id: 'l2', keyResultId: 'kr1', type: 'virtual' as const, virtualTicketId: 'vt1', order: 1 },
        ],
        virtualTickets: [{ id: 'vt1', title: 'VT', issueType: 'Task', createdAt: '2025-01-01' }] as VirtualTicket[],
        relations: [] as OKRRelation[],
      };

      const result = computeUnlinkWork(data, 'l1');
      expect(result.links).toHaveLength(1);
      expect(result.virtualTickets).toHaveLength(1);
    });

    it('연결된 관계(relation)도 함께 삭제한다', () => {
      const data = {
        links: [
          { id: 'l1', keyResultId: 'kr1', type: 'jira' as const, issueKey: 'PROJ-1', order: 0 },
          { id: 'l2', keyResultId: 'kr1', type: 'jira' as const, issueKey: 'PROJ-2', order: 1 },
        ],
        virtualTickets: [] as VirtualTicket[],
        relations: [
          makeRelation({ id: 'r1', fromType: 'link', fromId: 'l1', toType: 'link', toId: 'l2' }),
          makeRelation({ id: 'r2', fromType: 'link', fromId: 'l2', toType: 'link', toId: 'l3' }),
        ],
      };

      const result = computeUnlinkWork(data, 'l1');
      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].id).toBe('r2');
    });
  });

  describe('computeDeleteVirtualTicket', () => {
    it('가상 티켓과 연결된 링크, 관계를 모두 삭제한다', () => {
      const data = {
        links: [
          { id: 'l1', keyResultId: 'kr1', type: 'virtual' as const, virtualTicketId: 'vt1', order: 0 },
          { id: 'l2', keyResultId: 'kr1', type: 'jira' as const, issueKey: 'PROJ-1', order: 1 },
        ],
        virtualTickets: [{ id: 'vt1', title: 'VT', issueType: 'Task', createdAt: '2025-01-01' }] as VirtualTicket[],
        relations: [
          makeRelation({ id: 'r1', fromType: 'link', fromId: 'l1', toType: 'link', toId: 'l2' }),
          makeRelation({ id: 'r2', fromType: 'link', fromId: 'l2', toType: 'link', toId: 'l3' }),
        ],
      };

      const result = computeDeleteVirtualTicket(data, 'vt1');

      expect(result.virtualTickets).toHaveLength(0);
      expect(result.links).toHaveLength(1);
      expect(result.links[0].id).toBe('l2');
      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].id).toBe('r2');
    });

    it('존재하지 않는 vtId면 변경 없다', () => {
      const data = {
        links: [{ id: 'l1', keyResultId: 'kr1', type: 'jira' as const, issueKey: 'PROJ-1', order: 0 }],
        virtualTickets: [{ id: 'vt1', title: 'VT', issueType: 'Task', createdAt: '2025-01-01' }] as VirtualTicket[],
        relations: [] as OKRRelation[],
      };

      const result = computeDeleteVirtualTicket(data, 'nonexistent');
      expect(result.virtualTickets).toHaveLength(1);
      expect(result.links).toHaveLength(1);
    });
  });

  describe('computeDeleteGroup', () => {
    it('그룹 삭제 시 소속 카드를 비그룹으로 전환한다', () => {
      const data = {
        groups: [{ id: 'g1', keyResultId: 'kr1', title: 'Group 1', order: 0 }] as OKRGroup[],
        links: [
          { id: 'l1', keyResultId: 'kr1', type: 'jira' as const, groupId: 'g1', order: 0 },
          { id: 'l2', keyResultId: 'kr1', type: 'jira' as const, groupId: undefined, order: 1 },
        ] as OKRLink[],
        relations: [] as OKRRelation[],
      };

      const result = computeDeleteGroup(data, 'g1');

      expect(result.groups).toHaveLength(0);
      expect(result.links[0].groupId).toBeUndefined();
      expect(result.links[1].groupId).toBeUndefined();
    });

    it('다른 그룹의 카드는 영향받지 않는다', () => {
      const data = {
        groups: [
          { id: 'g1', keyResultId: 'kr1', title: 'Group 1', order: 0 },
          { id: 'g2', keyResultId: 'kr1', title: 'Group 2', order: 1 },
        ] as OKRGroup[],
        links: [
          { id: 'l1', keyResultId: 'kr1', type: 'jira' as const, groupId: 'g1', order: 0 },
          { id: 'l2', keyResultId: 'kr1', type: 'jira' as const, groupId: 'g2', order: 1 },
        ] as OKRLink[],
        relations: [] as OKRRelation[],
      };

      const result = computeDeleteGroup(data, 'g1');

      expect(result.groups).toHaveLength(1);
      expect(result.links[1].groupId).toBe('g2');
    });

    it('하위 그룹과 연결된 관계도 함께 삭제한다', () => {
      const data = {
        groups: [
          { id: 'g1', keyResultId: 'kr1', title: 'Parent', order: 0 },
          { id: 'g2', keyResultId: 'kr1', title: 'Child', order: 0, parentGroupId: 'g1' },
        ] as OKRGroup[],
        links: [] as OKRLink[],
        relations: [
          makeRelation({ id: 'r1', fromType: 'group', fromId: 'g2', toType: 'link', toId: 'l1' }),
          makeRelation({ id: 'r2', fromType: 'link', fromId: 'l1', toType: 'link', toId: 'l2' }),
        ],
      };

      const result = computeDeleteGroup(data, 'g1');

      expect(result.groups).toHaveLength(0);
      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].id).toBe('r2');
    });
  });
});
