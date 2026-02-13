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
  /** SVG path d attribute for obstacle-avoiding route */
  path: string;
  relationId: string;
  /** All waypoints including start and end */
  waypoints: { x: number; y: number }[];
  /** Whether this arrow uses manually defined waypoints */
  hasManualWaypoints: boolean;
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

// ─── Nested group helpers ──────────────────────────────────────────────────

/** Maximum nesting depth (group → subgroup). Subgroups cannot contain further groups. */
export const MAX_GROUP_DEPTH = 3;

/** Calculate the depth of a group (1 = top-level, 2 = subgroup). */
export function getGroupDepth(
  groupId: string,
  groups: { id: string; parentGroupId?: string }[],
): number {
  let depth = 1;
  let current = groups.find((g) => g.id === groupId);
  while (current?.parentGroupId) {
    depth++;
    current = groups.find((g) => g.id === current!.parentGroupId);
    if (depth > MAX_GROUP_DEPTH) break; // safety guard
  }
  return depth;
}

/** Convert group-local coordinates to canvas-absolute by walking up the parent chain. */
export function toAbsoluteCoords(
  localX: number,
  localY: number,
  parentGroupId: string | undefined,
  groups: { id: string; parentGroupId?: string; x?: number; y?: number }[],
): { x: number; y: number } {
  let absX = localX;
  let absY = localY;
  let currentParentId = parentGroupId;
  while (currentParentId) {
    const parent = groups.find((g) => g.id === currentParentId);
    if (!parent) break;
    absX += parent.x ?? 0;
    absY += (parent.y ?? 0) + GROUP_HEADER_H;
    currentParentId = parent.parentGroupId;
  }
  return { x: absX, y: absY };
}

/** Convert canvas-absolute coordinates to local coordinates relative to a target group. */
export function toLocalCoords(
  absX: number,
  absY: number,
  targetGroupId: string,
  groups: { id: string; parentGroupId?: string; x?: number; y?: number }[],
): { x: number; y: number } {
  const abs = toAbsoluteCoords(0, 0, targetGroupId, groups);
  return { x: absX - abs.x, y: absY - abs.y };
}

/** Get all descendant group IDs (children, grandchildren, etc.) of a given group. */
export function getDescendantGroupIds(
  groupId: string,
  groups: { id: string; parentGroupId?: string }[],
): string[] {
  const result: string[] = [];
  const queue = [groupId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = groups.filter((g) => g.parentGroupId === current);
    for (const child of children) {
      result.push(child.id);
      queue.push(child.id);
    }
  }
  return result;
}
