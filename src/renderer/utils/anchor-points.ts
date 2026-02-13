/**
 * Anchor Point Utilities
 *
 * Pure Business Logic Layer utility for anchor point position calculation,
 * relation validation, and connection helpers.
 *
 * Architecture Layer: Business Logic
 * No React, no DOM, no side effects - pure functions only.
 */

import type { AnchorPosition, ConnectionEndpointType, OKRRelation, OKRLink, OKRGroup } from '../types/jira.types';

/** Rectangle in canvas coordinates */
export interface ElementRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** All four anchor positions */
export const ALL_ANCHORS: AnchorPosition[] = ['top', 'bottom', 'left', 'right'];

/**
 * Calculate the absolute canvas position of an anchor point on an element.
 */
export function getAnchorPoint(
  rect: ElementRect,
  anchor: AnchorPosition,
): { x: number; y: number } {
  switch (anchor) {
    case 'top':    return { x: rect.x + rect.w / 2, y: rect.y };
    case 'bottom': return { x: rect.x + rect.w / 2, y: rect.y + rect.h };
    case 'left':   return { x: rect.x,               y: rect.y + rect.h / 2 };
    case 'right':  return { x: rect.x + rect.w,      y: rect.y + rect.h / 2 };
  }
}

/**
 * Get the CSS position offset of an anchor relative to the element's top-left.
 * Used for positioning anchor dot elements within a component.
 */
export function getAnchorOffset(anchor: AnchorPosition): { left: string; top: string } {
  switch (anchor) {
    case 'top':    return { left: '50%', top: '0%' };
    case 'bottom': return { left: '50%', top: '100%' };
    case 'left':   return { left: '0%',  top: '50%' };
    case 'right':  return { left: '100%', top: '50%' };
  }
}

/**
 * Find the nearest anchor point on a target rect to a given point.
 * Used for auto-suggesting anchor when user drags toward an element.
 */
export function findNearestAnchor(
  rect: ElementRect,
  point: { x: number; y: number },
): AnchorPosition {
  let nearest: AnchorPosition = 'top';
  let minDist = Infinity;

  for (const anchor of ALL_ANCHORS) {
    const ap = getAnchorPoint(rect, anchor);
    const dist = Math.hypot(ap.x - point.x, ap.y - point.y);
    if (dist < minDist) {
      minDist = dist;
      nearest = anchor;
    }
  }
  return nearest;
}

/**
 * Determine the best default anchor pair between two rects.
 * Used when creating a connection without explicit anchor selection.
 */
export function suggestAnchorPair(
  fromRect: ElementRect,
  toRect: ElementRect,
): { fromAnchor: AnchorPosition; toAnchor: AnchorPosition } {
  const fromCenter = { x: fromRect.x + fromRect.w / 2, y: fromRect.y + fromRect.h / 2 };
  const toCenter = { x: toRect.x + toRect.w / 2, y: toRect.y + toRect.h / 2 };

  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { fromAnchor: 'right', toAnchor: 'left' }
      : { fromAnchor: 'left', toAnchor: 'right' };
  } else {
    return dy >= 0
      ? { fromAnchor: 'bottom', toAnchor: 'top' }
      : { fromAnchor: 'top', toAnchor: 'bottom' };
  }
}

/**
 * Check if a relation between two endpoints already exists (bidirectional check).
 */
export function relationExists(
  relations: OKRRelation[],
  fromType: ConnectionEndpointType,
  fromId: string,
  toType: ConnectionEndpointType,
  toId: string,
): boolean {
  return relations.some(
    (r) =>
      (r.fromType === fromType && r.fromId === fromId && r.toType === toType && r.toId === toId) ||
      (r.fromType === toType && r.fromId === toId && r.toType === fromType && r.toId === fromId),
  );
}

/**
 * Check if a relation belongs to a specific KR canvas.
 * Both endpoints must reference entities within the given KR.
 */
export function isRelationInKR(
  rel: OKRRelation,
  links: OKRLink[],
  groups: OKRGroup[],
  krId: string,
): boolean {
  const fromInKR =
    (rel.fromType === 'link' && links.some((l) => l.id === rel.fromId && l.keyResultId === krId)) ||
    (rel.fromType === 'group' && groups.some((g) => g.id === rel.fromId && g.keyResultId === krId));
  const toInKR =
    (rel.toType === 'link' && links.some((l) => l.id === rel.toId && l.keyResultId === krId)) ||
    (rel.toType === 'group' && groups.some((g) => g.id === rel.toId && g.keyResultId === krId));
  return fromInKR && toInKR;
}

/**
 * Filter out relations that reference any of the excluded entity IDs.
 * Used when deleting cards or groups to clean up associated relations.
 */
export function filterRelationsExcluding(
  relations: OKRRelation[],
  excludeType: ConnectionEndpointType,
  excludeIds: Set<string>,
): OKRRelation[] {
  return relations.filter(
    (r) =>
      !(r.fromType === excludeType && excludeIds.has(r.fromId)) &&
      !(r.toType === excludeType && excludeIds.has(r.toId)),
  );
}

/**
 * Find the best segment index to insert a new waypoint.
 * Returns the index at which to splice the waypoint into the waypoints array.
 *
 * For a path with waypoints [start, w0, w1, ..., end],
 * this finds which segment (start→w0, w0→w1, ..., wN→end) is closest to the point.
 */
export function findBestInsertIndex(
  point: { x: number; y: number },
  allWaypoints: { x: number; y: number }[],
): number {
  if (allWaypoints.length < 2) return 0;

  let bestIndex = 0;
  let minDist = Infinity;

  for (let i = 0; i < allWaypoints.length - 1; i++) {
    const a = allWaypoints[i];
    const b = allWaypoints[i + 1];
    const dist = pointToSegmentDistance(point, a, b);
    if (dist < minDist) {
      minDist = dist;
      bestIndex = i;
    }
  }

  // Insert after the start of the closest segment
  // Since allWaypoints includes start/end, and user waypoints are in the middle,
  // we return the index for the user waypoints array (excluding start/end)
  return bestIndex;
}

/**
 * Calculate the distance from a point to a line segment.
 */
function pointToSegmentDistance(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;

  return Math.hypot(p.x - projX, p.y - projY);
}
