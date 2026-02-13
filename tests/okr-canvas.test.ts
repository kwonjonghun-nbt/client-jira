import { describe, it, expect } from 'vitest';
import {
  rectsOverlap,
  assignDefaultPosition,
  CARD_W,
  CARD_H,
  AREA_PAD,
  GAP,
  GROUP_HEADER_H,
  DRAG_THRESHOLD,
  MIN_ZOOM,
  MAX_ZOOM,
  type Rect,
} from '../src/renderer/hooks/okr/okr-canvas.types';

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
    // 800px 컨테이너에서 AREA_PAD 양쪽, 카드 너비 200 + GAP 10 → 대략 3~4개
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

// ─── Constants ──────────────────────────────────────────────────────────────

describe('캔버스 상수', () => {
  it('카드 크기가 정의되어 있다', () => {
    expect(CARD_W).toBe(200);
    expect(CARD_H).toBe(90);
  });

  it('그룹 헤더 높이가 정의되어 있다', () => {
    expect(GROUP_HEADER_H).toBe(36);
  });

  it('드래그 임계값이 정의되어 있다', () => {
    expect(DRAG_THRESHOLD).toBe(3);
  });

  it('줌 범위가 정의되어 있다', () => {
    expect(MIN_ZOOM).toBeLessThan(MAX_ZOOM);
    expect(MIN_ZOOM).toBeGreaterThan(0);
  });
});

// ─── Drag coordinate logic ──────────────────────────────────────────────────

describe('드래그 좌표 계산 로직', () => {
  // useCanvasDrag에서 사용하는 좌표 계산을 순수 함수로 테스트

  function calcDragPosition(
    itemX: number,
    itemY: number,
    dx: number,
    dy: number,
    parentGroupId?: string,
  ): { x: number; y: number } {
    const rawX = itemX + dx;
    const rawY = itemY + dy;
    return {
      x: parentGroupId ? rawX : Math.max(0, rawX),
      y: parentGroupId ? rawY : Math.max(0, rawY),
    };
  }

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
  // useCanvasDrag onUp 내부의 그룹 히트테스트를 순수 함수로 테스트

  interface GroupRect {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }

  function hitTestGroup(
    canvasX: number,
    canvasY: number,
    cardW: number,
    cardH: number,
    groups: GroupRect[],
  ): string | undefined {
    const centerX = canvasX + cardW / 2;
    const centerY = canvasY + cardH / 2;
    for (const g of groups) {
      if (
        centerX >= g.x &&
        centerX <= g.x + g.w &&
        centerY >= g.y + GROUP_HEADER_H &&
        centerY <= g.y + g.h
      ) {
        return g.id;
      }
    }
    return undefined;
  }

  const group: GroupRect = { id: 'g1', x: 100, y: 100, w: 320, h: 200 };

  it('카드 중심이 그룹 카드 영역 안에 있으면 그룹 id를 반환한다', () => {
    // 카드 중심: (200 + 100, 150 + 45) = (300, 195)
    // 그룹 카드 영역: x=100~420, y=136~300
    const result = hitTestGroup(200, 150, CARD_W, CARD_H, [group]);
    expect(result).toBe('g1');
  });

  it('카드 중심이 그룹 헤더 영역에 있으면 매칭하지 않는다', () => {
    // 카드 center_y = 50 + 45 = 95, 그룹 헤더: y=100~136
    const result = hitTestGroup(200, 50, CARD_W, CARD_H, [group]);
    expect(result).toBeUndefined();
  });

  it('카드 중심이 그룹 밖에 있으면 undefined를 반환한다', () => {
    const result = hitTestGroup(500, 500, CARD_W, CARD_H, [group]);
    expect(result).toBeUndefined();
  });

  it('여러 그룹 중 첫 번째 매칭 그룹을 반환한다', () => {
    const groups: GroupRect[] = [
      { id: 'g1', x: 0, y: 0, w: 300, h: 200 },
      { id: 'g2', x: 0, y: 0, w: 400, h: 300 },
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
  it('canvas-absolute → group-relative 변환', () => {
    const canvasX = 250;
    const canvasY = 280;
    const groupX = 100;
    const groupY = 100;

    const relX = canvasX - groupX;
    const relY = canvasY - groupY - GROUP_HEADER_H;

    expect(relX).toBe(150);
    expect(relY).toBe(144);
  });

  it('group-relative → canvas-absolute 변환', () => {
    const relX = 50;
    const relY = 30;
    const groupX = 100;
    const groupY = 100;

    const canvasX = relX + groupX;
    const canvasY = relY + groupY + GROUP_HEADER_H;

    expect(canvasX).toBe(150);
    expect(canvasY).toBe(166);
  });
});

// ─── OKR data operations (pure logic from hooks) ────────────────────────────

describe('OKR 데이터 조작 로직', () => {
  // Pure function equivalents of the hook updater logic

  function unlinkWork(
    data: { links: any[]; virtualTickets: any[]; relations: any[] },
    linkId: string,
  ) {
    const linkToRemove = data.links.find((l: any) => l.id === linkId);
    const remainingLinks = data.links.filter((l: any) => l.id !== linkId);
    let virtualTickets = data.virtualTickets;

    if (linkToRemove?.type === 'virtual' && linkToRemove.virtualTicketId) {
      const vtId = linkToRemove.virtualTicketId;
      const stillLinked = remainingLinks.some(
        (l: any) => l.type === 'virtual' && l.virtualTicketId === vtId,
      );
      if (!stillLinked) {
        virtualTickets = virtualTickets.filter((vt: any) => vt.id !== vtId);
      }
    }

    return {
      links: remainingLinks,
      virtualTickets,
      relations: data.relations.filter(
        (r: any) => r.fromLinkId !== linkId && r.toLinkId !== linkId,
      ),
    };
  }

  function deleteVirtualTicket(
    data: { links: any[]; virtualTickets: any[]; relations: any[] },
    vtId: string,
  ) {
    const removedLinkIds = new Set(
      data.links
        .filter((l: any) => l.type === 'virtual' && l.virtualTicketId === vtId)
        .map((l: any) => l.id),
    );

    return {
      virtualTickets: data.virtualTickets.filter((vt: any) => vt.id !== vtId),
      links: data.links.filter(
        (l: any) => !(l.type === 'virtual' && l.virtualTicketId === vtId),
      ),
      relations: data.relations.filter(
        (r: any) => !removedLinkIds.has(r.fromLinkId) && !removedLinkIds.has(r.toLinkId),
      ),
    };
  }

  function deleteGroup(
    data: { groups: any[]; links: any[] },
    groupId: string,
  ) {
    return {
      groups: data.groups.filter((g: any) => g.id !== groupId),
      links: data.links.map((l: any) =>
        l.groupId === groupId ? { ...l, groupId: undefined } : l,
      ),
    };
  }

  describe('unlinkWork', () => {
    it('Jira 링크를 해제한다', () => {
      const data = {
        links: [{ id: 'l1', type: 'jira', issueKey: 'PROJ-1' }],
        virtualTickets: [],
        relations: [],
      };

      const result = unlinkWork(data, 'l1');
      expect(result.links).toHaveLength(0);
    });

    it('가상 티켓 링크 해제 시 고아 가상 티켓을 함께 삭제한다', () => {
      const data = {
        links: [{ id: 'l1', type: 'virtual', virtualTicketId: 'vt1' }],
        virtualTickets: [{ id: 'vt1', title: 'VT' }],
        relations: [],
      };

      const result = unlinkWork(data, 'l1');
      expect(result.links).toHaveLength(0);
      expect(result.virtualTickets).toHaveLength(0);
    });

    it('가상 티켓이 다른 링크에서도 참조 중이면 삭제하지 않는다', () => {
      const data = {
        links: [
          { id: 'l1', type: 'virtual', virtualTicketId: 'vt1' },
          { id: 'l2', type: 'virtual', virtualTicketId: 'vt1' },
        ],
        virtualTickets: [{ id: 'vt1', title: 'VT' }],
        relations: [],
      };

      const result = unlinkWork(data, 'l1');
      expect(result.links).toHaveLength(1);
      expect(result.virtualTickets).toHaveLength(1);
    });

    it('연결된 관계(relation)도 함께 삭제한다', () => {
      const data = {
        links: [
          { id: 'l1', type: 'jira' },
          { id: 'l2', type: 'jira' },
        ],
        virtualTickets: [],
        relations: [
          { id: 'r1', fromLinkId: 'l1', toLinkId: 'l2' },
          { id: 'r2', fromLinkId: 'l2', toLinkId: 'l3' },
        ],
      };

      const result = unlinkWork(data, 'l1');
      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].id).toBe('r2');
    });
  });

  describe('deleteVirtualTicket', () => {
    it('가상 티켓과 연결된 링크, 관계를 모두 삭제한다', () => {
      const data = {
        links: [
          { id: 'l1', type: 'virtual', virtualTicketId: 'vt1' },
          { id: 'l2', type: 'jira', issueKey: 'PROJ-1' },
        ],
        virtualTickets: [{ id: 'vt1', title: 'VT' }],
        relations: [
          { id: 'r1', fromLinkId: 'l1', toLinkId: 'l2' },
          { id: 'r2', fromLinkId: 'l2', toLinkId: 'l3' },
        ],
      };

      const result = deleteVirtualTicket(data, 'vt1');

      expect(result.virtualTickets).toHaveLength(0);
      expect(result.links).toHaveLength(1);
      expect(result.links[0].id).toBe('l2');
      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].id).toBe('r2');
    });

    it('존재하지 않는 vtId면 변경 없다', () => {
      const data = {
        links: [{ id: 'l1', type: 'jira' }],
        virtualTickets: [{ id: 'vt1' }],
        relations: [],
      };

      const result = deleteVirtualTicket(data, 'nonexistent');
      expect(result.virtualTickets).toHaveLength(1);
      expect(result.links).toHaveLength(1);
    });
  });

  describe('deleteGroup', () => {
    it('그룹 삭제 시 소속 카드를 비그룹으로 전환한다', () => {
      const data = {
        groups: [{ id: 'g1', title: 'Group 1' }],
        links: [
          { id: 'l1', groupId: 'g1', x: 50 },
          { id: 'l2', groupId: undefined, x: 100 },
        ],
      };

      const result = deleteGroup(data, 'g1');

      expect(result.groups).toHaveLength(0);
      expect(result.links[0].groupId).toBeUndefined();
      expect(result.links[1].groupId).toBeUndefined();
    });

    it('다른 그룹의 카드는 영향받지 않는다', () => {
      const data = {
        groups: [
          { id: 'g1', title: 'Group 1' },
          { id: 'g2', title: 'Group 2' },
        ],
        links: [
          { id: 'l1', groupId: 'g1' },
          { id: 'l2', groupId: 'g2' },
        ],
      };

      const result = deleteGroup(data, 'g1');

      expect(result.groups).toHaveLength(1);
      expect(result.links[1].groupId).toBe('g2');
    });
  });
});

// ─── Relation deduplication logic ───────────────────────────────────────────

describe('관계 중복 체크 로직', () => {
  function relationExists(
    relations: Array<{ fromLinkId: string; toLinkId: string }>,
    fromId: string,
    toId: string,
  ): boolean {
    return relations.some(
      (r) =>
        (r.fromLinkId === fromId && r.toLinkId === toId) ||
        (r.fromLinkId === toId && r.toLinkId === fromId),
    );
  }

  it('정방향 중복을 감지한다', () => {
    const relations = [{ fromLinkId: 'l1', toLinkId: 'l2' }];
    expect(relationExists(relations, 'l1', 'l2')).toBe(true);
  });

  it('역방향 중복을 감지한다', () => {
    const relations = [{ fromLinkId: 'l1', toLinkId: 'l2' }];
    expect(relationExists(relations, 'l2', 'l1')).toBe(true);
  });

  it('중복이 없으면 false를 반환한다', () => {
    const relations = [{ fromLinkId: 'l1', toLinkId: 'l2' }];
    expect(relationExists(relations, 'l1', 'l3')).toBe(false);
  });

  it('빈 관계 배열이면 false를 반환한다', () => {
    expect(relationExists([], 'l1', 'l2')).toBe(false);
  });
});
