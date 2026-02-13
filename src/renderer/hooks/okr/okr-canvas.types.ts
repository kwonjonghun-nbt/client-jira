import type { OKRData } from '../../types/jira.types';

// ─── Layout constants ───────────────────────────────────────────────────────

export const CARD_W = 200;
export const CARD_H = 90;
export const GROUP_HEADER_H = 36;
export const AREA_PAD = 16;
export const GAP = 10;
export const DRAG_THRESHOLD = 3;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;

// ─── Shared interfaces ─────────────────────────────────────────────────────

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DragInfo {
  type: 'card' | 'group';
  id: string;
  parentGroupId?: string;
  startMouseX: number;
  startMouseY: number;
  startItemX: number;
  startItemY: number;
  currentX: number;
  currentY: number;
}

export interface ArrowLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  relationId: string;
}

// ─── UpdateOKR helper type ──────────────────────────────────────────────────

export type UpdateOKR = (updater: (draft: OKRData) => OKRData) => void;

// ─── Positioning helpers ────────────────────────────────────────────────────

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function assignDefaultPosition(
  occupied: Rect[],
  itemW: number,
  itemH: number,
  containerW: number,
): { x: number; y: number } {
  const cols = Math.max(1, Math.floor((containerW - AREA_PAD * 2) / (itemW + GAP)));
  for (let row = 0; row < 50; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = AREA_PAD + col * (itemW + GAP);
      const cy = AREA_PAD + row * (itemH + GAP);
      const candidate: Rect = { x: cx, y: cy, w: itemW, h: itemH };
      if (!occupied.some((o) => rectsOverlap(candidate, o))) {
        return { x: cx, y: cy };
      }
    }
  }
  const maxY = occupied.reduce((m, p) => Math.max(m, p.y + p.h), 0);
  return { x: AREA_PAD, y: maxY + GAP };
}
