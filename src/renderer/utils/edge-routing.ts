/**
 * Edge Routing Utility
 *
 * Pure Business Logic Layer utility for calculating obstacle-avoiding arrow paths
 * between two points on an OKR canvas using A* pathfinding.
 *
 * Architecture Layer: Business Logic
 * Dependencies: pathfinding (npm package)
 * No React, no DOM, no side effects - pure functions only.
 */

import * as PF from 'pathfinding';
import type { AnchorPosition } from '../types/jira.types';

/** Rectangle obstacle on the canvas */
export interface ObstacleRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Configuration for edge routing */
export interface EdgeRoutingConfig {
  /** Grid cell size in pixels (default: 10) */
  gridSize?: number;
  /** Padding around obstacles in pixels (default: 12) */
  obstaclePadding?: number;
  /** Extra padding around the bounding box in pixels (default: 50) */
  boundsPadding?: number;
  /** Corner radius for rounded path corners (default: 8) */
  cornerRadius?: number;
  /** Stub length from anchor in anchor direction (default: 20) */
  stubLength?: number;
  /** Anchor position at start point */
  fromAnchor?: AnchorPosition;
  /** Anchor position at end point */
  toAnchor?: AnchorPosition;
  /** Source element bounding rect (for avoiding self-overlap in S-shape) */
  fromRect?: ObstacleRect;
  /** Target element bounding rect (for avoiding self-overlap in S-shape) */
  toRect?: ObstacleRect;
}

/** Result of edge routing */
export interface RoutedEdge {
  /** SVG path d attribute string */
  path: string;
  /** Waypoints of the route (canvas coordinates) */
  waypoints: { x: number; y: number }[];
  /** Whether obstacle avoidance was used (false = direct fallback) */
  routed: boolean;
}

/** Grid construction result */
export interface ObstacleGrid {
  grid: PF.Grid;
  offsetX: number;
  offsetY: number;
  cols: number;
  rows: number;
}

/**
 * Calculate bounding box from source, target, and obstacles.
 */
function calculateBounds(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  obstacles: ObstacleRect[],
  boundsPadding: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Math.min(x1, x2);
  let minY = Math.min(y1, y2);
  let maxX = Math.max(x1, x2);
  let maxY = Math.max(y1, y2);

  // Extend bounds to include all obstacles
  for (const obs of obstacles) {
    minX = Math.min(minX, obs.x);
    minY = Math.min(minY, obs.y);
    maxX = Math.max(maxX, obs.x + obs.w);
    maxY = Math.max(maxY, obs.y + obs.h);
  }

  // Add padding
  minX -= boundsPadding;
  minY -= boundsPadding;
  maxX += boundsPadding;
  maxY += boundsPadding;

  return { minX, minY, maxX, maxY };
}

/**
 * Build obstacle grid and return it with offset info.
 *
 * Creates a PF.Grid where cells overlapping obstacles (with padding) are unwalkable.
 * Source and target cells are always kept walkable.
 */
export function buildObstacleGrid(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  obstacles: ObstacleRect[],
  gridSize: number,
  obstaclePadding: number,
  boundsPadding: number,
): ObstacleGrid {
  const bounds = calculateBounds(x1, y1, x2, y2, obstacles, boundsPadding);

  const offsetX = bounds.minX;
  const offsetY = bounds.minY;
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  const cols = Math.ceil(width / gridSize);
  const rows = Math.ceil(height / gridSize);

  // Create grid (0 = walkable, 1 = unwalkable)
  const matrix: number[][] = [];
  for (let row = 0; row < rows; row++) {
    matrix[row] = new Array(cols).fill(0);
  }

  // Mark obstacle cells as unwalkable
  for (const obs of obstacles) {
    // Add padding around obstacle
    const obsMinX = obs.x - obstaclePadding;
    const obsMinY = obs.y - obstaclePadding;
    const obsMaxX = obs.x + obs.w + obstaclePadding;
    const obsMaxY = obs.y + obs.h + obstaclePadding;

    // Convert to grid coordinates
    const colStart = Math.floor((obsMinX - offsetX) / gridSize);
    const colEnd = Math.ceil((obsMaxX - offsetX) / gridSize);
    const rowStart = Math.floor((obsMinY - offsetY) / gridSize);
    const rowEnd = Math.ceil((obsMaxY - offsetY) / gridSize);

    // Mark cells as unwalkable
    for (let row = Math.max(0, rowStart); row < Math.min(rows, rowEnd); row++) {
      for (let col = Math.max(0, colStart); col < Math.min(cols, colEnd); col++) {
        matrix[row][col] = 1;
      }
    }
  }

  const grid = new PF.Grid(cols, rows);

  // Apply matrix to grid
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (matrix[row][col] === 1) {
        grid.setWalkableAt(col, row, false);
      }
    }
  }

  // Ensure source and target are ALWAYS walkable
  const startCol = Math.floor((x1 - offsetX) / gridSize);
  const startRow = Math.floor((y1 - offsetY) / gridSize);
  const endCol = Math.floor((x2 - offsetX) / gridSize);
  const endRow = Math.floor((y2 - offsetY) / gridSize);

  if (startCol >= 0 && startCol < cols && startRow >= 0 && startRow < rows) {
    grid.setWalkableAt(startCol, startRow, true);
  }
  if (endCol >= 0 && endCol < cols && endRow >= 0 && endRow < rows) {
    grid.setWalkableAt(endCol, endRow, true);
  }

  return { grid, offsetX, offsetY, cols, rows };
}

/**
 * Simplify path by removing collinear intermediate points.
 *
 * A point is collinear if it lies on the line between its predecessor and successor.
 * This significantly reduces the number of waypoints for straight segments.
 */
export function simplifyPath(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length <= 2) {
    return points;
  }

  const simplified: { x: number; y: number }[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Calculate direction vectors
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    // Check if direction changed (not collinear)
    // Use cross product to detect direction change
    const crossProduct = dx1 * dy2 - dy1 * dx2;

    if (Math.abs(crossProduct) > 0.01) {
      // Direction changed, keep this point
      simplified.push(curr);
    }
    // Otherwise skip this point (collinear)
  }

  simplified.push(points[points.length - 1]);

  return simplified;
}

/**
 * Generate SVG path string from waypoints with rounded corners.
 *
 * For 2 waypoints: simple straight line.
 * For 3+ waypoints: uses line segments with quadratic bezier curves at corners.
 */
export function waypointsToSVGPath(
  waypoints: { x: number; y: number }[],
  cornerRadius: number,
): string {
  if (waypoints.length < 2) {
    return '';
  }

  if (waypoints.length === 2) {
    // Direct straight line
    const [p1, p2] = waypoints;
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  }

  // Multiple waypoints - create path with rounded corners
  let path = `M ${waypoints[0].x} ${waypoints[0].y}`;

  for (let i = 1; i < waypoints.length - 1; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const next = waypoints[i + 1];

    // Calculate vectors
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    // Calculate effective corner radius (can't be larger than half of either segment)
    const maxRadius = Math.min(dist1 / 2, dist2 / 2, cornerRadius);

    if (maxRadius < 0.5) {
      // Segments too short for rounding, just use straight line
      path += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    // Calculate points before and after corner
    const beforeX = curr.x - (dx1 / dist1) * maxRadius;
    const beforeY = curr.y - (dy1 / dist1) * maxRadius;

    const afterX = curr.x + (dx2 / dist2) * maxRadius;
    const afterY = curr.y + (dy2 / dist2) * maxRadius;

    // Draw line to before-corner point, then quadratic curve through corner
    path += ` L ${beforeX} ${beforeY}`;
    path += ` Q ${curr.x} ${curr.y}, ${afterX} ${afterY}`;
  }

  // Final segment to last waypoint
  const last = waypoints[waypoints.length - 1];
  path += ` L ${last.x} ${last.y}`;

  return path;
}

/**
 * Build SVG path through user-defined manual waypoints with orthogonal stubs.
 * Used when a relation has manually placed bend points instead of A* routing.
 *
 * @param start Anchor start point (canvas coordinates)
 * @param end Anchor end point (canvas coordinates)
 * @param waypoints User-defined bend points (canvas coordinates)
 * @param fromAnchor Anchor position at start
 * @param toAnchor Anchor position at end
 * @param cornerRadius Corner radius for rounded bends (default: 8)
 * @param stubLength Length of stub in anchor direction (default: 20)
 */
export function buildWaypointPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  waypoints: { x: number; y: number }[],
  fromAnchor: AnchorPosition = 'right',
  toAnchor: AnchorPosition = 'left',
  cornerRadius: number = 8,
  stubLength: number = 20,
): RoutedEdge {
  const fromDir = getStubDirection(fromAnchor);
  const toDir = getStubDirection(toAnchor);

  // Add stubs at start and end
  const stubStart = {
    x: start.x + fromDir.dx * stubLength,
    y: start.y + fromDir.dy * stubLength,
  };

  const stubEnd = {
    x: end.x + toDir.dx * stubLength,
    y: end.y + toDir.dy * stubLength,
  };

  const allPoints = [start, stubStart, ...waypoints, stubEnd, end];
  const simplified = simplifyPath(allPoints);
  const svgPath = waypointsToSVGPath(simplified, cornerRadius);
  return {
    path: svgPath,
    waypoints: simplified,
    routed: false,
  };
}

/**
 * Get stub direction vector based on anchor position.
 * Returns (dx, dy) unit direction.
 */
function getStubDirection(anchor: AnchorPosition): { dx: number; dy: number } {
  switch (anchor) {
    case 'right': return { dx: 1, dy: 0 };
    case 'left': return { dx: -1, dy: 0 };
    case 'top': return { dx: 0, dy: -1 };
    case 'bottom': return { dx: 0, dy: 1 };
  }
}

/**
 * Check if fromAnchor is horizontal (left/right).
 */
function isHorizontal(anchor: AnchorPosition): boolean {
  return anchor === 'left' || anchor === 'right';
}

/**
 * Create orthogonal path with stubs.
 * Minimises bends: uses L-shape (1 corner) when possible, S-shape (2 corners) only when needed.
 * When S-shape is used, the midpoint is pushed outside source/target rects to avoid overlap.
 */
function createOrthogonalPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fromAnchor: AnchorPosition = 'right',
  toAnchor: AnchorPosition = 'left',
  stubLength: number = 20,
  fromRect?: ObstacleRect,
  toRect?: ObstacleRect,
): RoutedEdge {
  const fromDir = getStubDirection(fromAnchor);
  const toDir = getStubDirection(toAnchor);

  const stubStart = {
    x: x1 + fromDir.dx * stubLength,
    y: y1 + fromDir.dy * stubLength,
  };

  const stubEnd = {
    x: x2 + toDir.dx * stubLength,
    y: y2 + toDir.dy * stubLength,
  };

  const points: { x: number; y: number }[] = [{ x: x1, y: y1 }, stubStart];

  const fromH = isHorizontal(fromAnchor);
  const toH = isHorizontal(toAnchor);

  if (fromH !== toH) {
    // Perpendicular anchors (e.g. right→top): L-shape — one corner
    points.push({ x: fromH ? stubEnd.x : stubStart.x, y: fromH ? stubStart.y : stubEnd.y });
    points.push(stubEnd);
  } else if (fromH) {
    // Both horizontal anchors
    const sameDirection = fromAnchor === toAnchor;
    const converging = !sameDirection && (
      (fromAnchor === 'right' && stubStart.x < stubEnd.x) ||
      (fromAnchor === 'left' && stubStart.x > stubEnd.x)
    );

    if (converging) {
      // Simple S-shape: midX between elements
      let midX = (stubStart.x + stubEnd.x) / 2;
      if (fromRect && toRect) {
        // Use edge-aware midpoint
        const fromEdge = fromAnchor === 'right' ? fromRect.x + fromRect.w : fromRect.x;
        const toEdge = toAnchor === 'left' ? toRect.x : toRect.x + toRect.w;
        midX = (fromEdge + toEdge) / 2;
      }
      points.push({ x: midX, y: stubStart.y });
      points.push({ x: midX, y: stubEnd.y });
    } else if (sameDirection) {
      // U-shape: both stubs go same direction
      const pad = stubLength;
      let turnX: number;
      if (fromAnchor === 'right') {
        turnX = Math.max(stubStart.x, stubEnd.x) + pad;
        if (fromRect && toRect) {
          turnX = Math.max(fromRect.x + fromRect.w, toRect.x + toRect.w) + stubLength + pad;
        }
      } else {
        turnX = Math.min(stubStart.x, stubEnd.x) - pad;
        if (fromRect && toRect) {
          turnX = Math.min(fromRect.x, toRect.x) - stubLength - pad;
        }
      }
      points.push({ x: turnX, y: stubStart.y });
      points.push({ x: turnX, y: stubEnd.y });
    } else {
      // Diverging: Z-shape using vertical gap
      let midY: number;
      if (fromRect && toRect) {
        const fromTop = fromRect.y;
        const fromBottom = fromRect.y + fromRect.h;
        const toTop = toRect.y;
        const toBottom = toRect.y + toRect.h;

        if (fromBottom <= toTop) {
          // Gap below source, above target
          midY = (fromBottom + toTop) / 2;
        } else if (toBottom <= fromTop) {
          // Gap below target, above source
          midY = (toBottom + fromTop) / 2;
        } else {
          // Vertically overlapping — go above or below both
          const pad = stubLength;
          const topOption = Math.min(fromTop, toTop) - pad;
          const bottomOption = Math.max(fromBottom, toBottom) + pad;
          const avgStubY = (stubStart.y + stubEnd.y) / 2;
          midY = Math.abs(topOption - avgStubY) < Math.abs(bottomOption - avgStubY) ? topOption : bottomOption;
        }
      } else {
        midY = (stubStart.y + stubEnd.y) / 2;
      }
      // Z-shape: horizontal stub → vertical through midY → horizontal to other stub
      points.push({ x: stubStart.x, y: midY });
      points.push({ x: stubEnd.x, y: midY });
    }
    points.push(stubEnd);
  } else {
    // Both vertical anchors
    const sameDirection = fromAnchor === toAnchor;
    const converging = !sameDirection && (
      (fromAnchor === 'bottom' && stubStart.y < stubEnd.y) ||
      (fromAnchor === 'top' && stubStart.y > stubEnd.y)
    );

    if (converging) {
      // Simple S-shape: midY between elements
      let midY = (stubStart.y + stubEnd.y) / 2;
      if (fromRect && toRect) {
        // Use edge-aware midpoint
        const fromEdge = fromAnchor === 'bottom' ? fromRect.y + fromRect.h : fromRect.y;
        const toEdge = toAnchor === 'top' ? toRect.y : toRect.y + toRect.h;
        midY = (fromEdge + toEdge) / 2;
      }
      points.push({ x: stubStart.x, y: midY });
      points.push({ x: stubEnd.x, y: midY });
    } else if (sameDirection) {
      // U-shape: both stubs go same direction
      const pad = stubLength;
      let turnY: number;
      if (fromAnchor === 'bottom') {
        turnY = Math.max(stubStart.y, stubEnd.y) + pad;
        if (fromRect && toRect) {
          turnY = Math.max(fromRect.y + fromRect.h, toRect.y + toRect.h) + stubLength + pad;
        }
      } else {
        turnY = Math.min(stubStart.y, stubEnd.y) - pad;
        if (fromRect && toRect) {
          turnY = Math.min(fromRect.y, toRect.y) - stubLength - pad;
        }
      }
      points.push({ x: stubStart.x, y: turnY });
      points.push({ x: stubEnd.x, y: turnY });
    } else {
      // Diverging: Z-shape using horizontal gap
      let midX: number;
      if (fromRect && toRect) {
        const fromLeft = fromRect.x;
        const fromRight = fromRect.x + fromRect.w;
        const toLeft = toRect.x;
        const toRight = toRect.x + toRect.w;

        if (fromRight <= toLeft) {
          // Gap to the right of source, left of target
          midX = (fromRight + toLeft) / 2;
        } else if (toRight <= fromLeft) {
          // Gap to the right of target, left of source
          midX = (toRight + fromLeft) / 2;
        } else {
          // Horizontally overlapping — go left or right of both
          const pad = stubLength;
          const leftOption = Math.min(fromLeft, toLeft) - pad;
          const rightOption = Math.max(fromRight, toRight) + pad;
          const avgStubX = (stubStart.x + stubEnd.x) / 2;
          midX = Math.abs(leftOption - avgStubX) < Math.abs(rightOption - avgStubX) ? leftOption : rightOption;
        }
      } else {
        midX = (stubStart.x + stubEnd.x) / 2;
      }
      // Z-shape: vertical stub → horizontal through midX → vertical to other stub
      points.push({ x: midX, y: stubStart.y });
      points.push({ x: midX, y: stubEnd.y });
    }
    points.push(stubEnd);
  }

  points.push({ x: x2, y: y2 });

  const simplified = simplifyPath(points);
  const svgPath = waypointsToSVGPath(simplified, 8);

  return {
    path: svgPath,
    waypoints: simplified,
    routed: false,
  };
}

/**
 * Check if an orthogonal segment (horizontal or vertical) is clear of all obstacles.
 */
function segmentClear(
  ax: number, ay: number, bx: number, by: number,
  obstacles: ObstacleRect[], padding: number,
): boolean {
  // Build a thin rect for the segment
  const minX = Math.min(ax, bx) - padding;
  const maxX = Math.max(ax, bx) + padding;
  const minY = Math.min(ay, by) - padding;
  const maxY = Math.max(ay, by) + padding;
  return !obstacles.some((o) =>
    o.x < maxX && o.x + o.w > minX && o.y < maxY && o.y + o.h > minY,
  );
}

/**
 * Try to connect two points with an L-shape (2 segments, 1 corner).
 * Returns the corner point if clear, or null if blocked.
 */
function tryLShape(
  cur: { x: number; y: number },
  target: { x: number; y: number },
  obstacles: ObstacleRect[],
  padding: number,
): { x: number; y: number } | null {
  // Option A: horizontal first, then vertical
  const cornerA = { x: target.x, y: cur.y };
  if (
    segmentClear(cur.x, cur.y, cornerA.x, cornerA.y, obstacles, padding) &&
    segmentClear(cornerA.x, cornerA.y, target.x, target.y, obstacles, padding)
  ) {
    return cornerA;
  }

  // Option B: vertical first, then horizontal
  const cornerB = { x: cur.x, y: target.y };
  if (
    segmentClear(cur.x, cur.y, cornerB.x, cornerB.y, obstacles, padding) &&
    segmentClear(cornerB.x, cornerB.y, target.x, target.y, obstacles, padding)
  ) {
    return cornerB;
  }

  return null;
}

/**
 * Try to connect two points with a U-shape (3 segments, 2 corners).
 * Routes via an intermediate line derived from obstacle edges.
 * Returns the two corner points if clear, or null if blocked.
 */
function tryUShape(
  cur: { x: number; y: number },
  target: { x: number; y: number },
  obstacles: ObstacleRect[],
  padding: number,
): { x: number; y: number }[] | null {
  const gap = padding + 4;

  // Collect candidate detour coordinates from obstacle edges
  const xCandidates = new Set<number>();
  const yCandidates = new Set<number>();
  for (const o of obstacles) {
    xCandidates.add(o.x - gap);
    xCandidates.add(o.x + o.w + gap);
    yCandidates.add(o.y - gap);
    yCandidates.add(o.y + o.h + gap);
  }

  // Pattern 1: horizontal → vertical → horizontal (detour via x coordinate)
  for (const mx of xCandidates) {
    const c1 = { x: mx, y: cur.y };
    const c2 = { x: mx, y: target.y };
    if (
      segmentClear(cur.x, cur.y, c1.x, c1.y, obstacles, padding) &&
      segmentClear(c1.x, c1.y, c2.x, c2.y, obstacles, padding) &&
      segmentClear(c2.x, c2.y, target.x, target.y, obstacles, padding)
    ) {
      return [c1, c2];
    }
  }

  // Pattern 2: vertical → horizontal → vertical (detour via y coordinate)
  for (const my of yCandidates) {
    const c1 = { x: cur.x, y: my };
    const c2 = { x: target.x, y: my };
    if (
      segmentClear(cur.x, cur.y, c1.x, c1.y, obstacles, padding) &&
      segmentClear(c1.x, c1.y, c2.x, c2.y, obstacles, padding) &&
      segmentClear(c2.x, c2.y, target.x, target.y, obstacles, padding)
    ) {
      return [c1, c2];
    }
  }

  return null;
}

/**
 * Smooth an orthogonal A* path to the minimum number of bends.
 *
 * The input path has the structure:
 *   [anchorStart, stubStart, ...A* middle..., stubEnd, anchorEnd]
 *
 * We preserve the first two (anchor + stub) and last two (stub + anchor)
 * exactly, and only smooth the A* middle section between stubs.
 *
 * For each point, tries to reach the farthest point via:
 *   1. Direct straight line (0 bends)
 *   2. L-shape (1 bend)
 *   3. U-shape (2 bends) — via obstacle edge detour
 * Falls back to the next A* point if nothing works.
 */
function smoothOrthogonal(
  points: { x: number; y: number }[],
  obstacles: ObstacleRect[],
  padding: number,
): { x: number; y: number }[] {
  // Need at least 5 points to have something to smooth
  if (points.length <= 4) return points;

  // Preserve anchor+stub at start (indices 0,1) and end (last two)
  const head = points.slice(0, 2); // [anchorStart, stubStart]
  const tail = points.slice(-2);   // [stubEnd, anchorEnd]
  const middle = points.slice(1, -1); // [stubStart, ...A* path..., stubEnd]

  // Smooth only the middle section
  const smoothed: { x: number; y: number }[] = [middle[0]];
  let i = 0;

  while (i < middle.length - 1) {
    const cur = smoothed[smoothed.length - 1];
    let bestJ = i + 1;
    let insertPoints: { x: number; y: number }[] = [];

    // Try to reach the farthest point possible
    for (let j = middle.length - 1; j > i; j--) {
      const target = middle[j];

      // 1. Direct straight line (same x or same y)
      if (
        (Math.abs(cur.x - target.x) < 0.5 || Math.abs(cur.y - target.y) < 0.5) &&
        segmentClear(cur.x, cur.y, target.x, target.y, obstacles, padding)
      ) {
        bestJ = j;
        insertPoints = [];
        break;
      }

      // 2. L-shape (1 corner)
      const lCorner = tryLShape(cur, target, obstacles, padding);
      if (lCorner) {
        bestJ = j;
        insertPoints = [lCorner];
        break;
      }

      // 3. U-shape (2 corners) — only for farther targets
      if (j > i + 1) {
        const uCorners = tryUShape(cur, target, obstacles, padding);
        if (uCorners) {
          bestJ = j;
          insertPoints = uCorners;
          break;
        }
      }
    }

    smoothed.push(...insertPoints);
    smoothed.push(middle[bestJ]);
    i = bestJ;
  }

  // Reassemble: head[0] (anchor) + smoothed middle + tail[1] (anchor)
  const assembled = [head[0], ...smoothed, tail[1]];
  return simplifyPath(assembled);
}

/**
 * Check if an orthogonal path's actual segments are all clear of obstacles.
 * Validates the REAL path shape (S/Z/U/L) instead of just a bounding box.
 */
function pathSegmentsClear(
  waypoints: { x: number; y: number }[],
  obstacles: ObstacleRect[],
  padding: number,
): boolean {
  for (let i = 0; i < waypoints.length - 1; i++) {
    if (!segmentClear(waypoints[i].x, waypoints[i].y, waypoints[i + 1].x, waypoints[i + 1].y, obstacles, padding)) {
      return false;
    }
  }
  return true;
}

export function routeEdge(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  obstacles: ObstacleRect[],
  config?: EdgeRoutingConfig,
): RoutedEdge {
  // Apply default config
  const gridSize = config?.gridSize ?? 10;
  const obstaclePadding = config?.obstaclePadding ?? 12;
  const boundsPadding = config?.boundsPadding ?? 50;
  const cornerRadius = config?.cornerRadius ?? 8;
  const stubLength = config?.stubLength ?? 20;
  const fromAnchor = config?.fromAnchor ?? 'right';
  const toAnchor = config?.toAnchor ?? 'left';
  const fromRect = config?.fromRect;
  const toRect = config?.toRect;

  // Try clean orthogonal path first (S/Z/U/L-shape with minimum bends)
  const orthoCandidate = createOrthogonalPath(x1, y1, x2, y2, fromAnchor, toAnchor, stubLength, fromRect, toRect);

  // If no obstacles, or if the orthogonal path's actual segments are all clear, use it
  if (obstacles.length === 0 || pathSegmentsClear(orthoCandidate.waypoints, obstacles, obstaclePadding)) {
    return orthoCandidate;
  }

  // Calculate stub endpoints for A* pathfinding
  const fromDir = getStubDirection(fromAnchor);
  const toDir = getStubDirection(toAnchor);
  const stubStartX = x1 + fromDir.dx * stubLength;
  const stubStartY = y1 + fromDir.dy * stubLength;
  const stubEndX = x2 + toDir.dx * stubLength;
  const stubEndY = y2 + toDir.dy * stubLength;

  // Build grid with obstacles
  const { grid, offsetX, offsetY, cols, rows } = buildObstacleGrid(
    stubStartX,
    stubStartY,
    stubEndX,
    stubEndY,
    obstacles,
    gridSize,
    obstaclePadding,
    boundsPadding,
  );

  // Convert stub endpoints to grid coordinates
  const startCol = Math.floor((stubStartX - offsetX) / gridSize);
  const startRow = Math.floor((stubStartY - offsetY) / gridSize);
  const endCol = Math.floor((stubEndX - offsetX) / gridSize);
  const endRow = Math.floor((stubEndY - offsetY) / gridSize);

  // Validate coordinates are within grid
  if (
    startCol < 0 || startCol >= cols ||
    startRow < 0 || startRow >= rows ||
    endCol < 0 || endCol >= cols ||
    endRow < 0 || endRow >= rows
  ) {
    // Out of bounds, use orthogonal path
    return createOrthogonalPath(x1, y1, x2, y2, fromAnchor, toAnchor, stubLength);
  }

  // Run A* pathfinding with orthogonal movement only
  const finder = new PF.AStarFinder({
    allowDiagonal: false,
  });

  const gridPath = finder.findPath(startCol, startRow, endCol, endRow, grid);

  // Check if path was found
  if (gridPath.length === 0) {
    // No path found, use orthogonal fallback
    return createOrthogonalPath(x1, y1, x2, y2, fromAnchor, toAnchor, stubLength);
  }

  // Convert grid path to canvas coordinates
  const canvasWaypoints = gridPath.map(([col, row]) => ({
    x: offsetX + col * gridSize,
    y: offsetY + row * gridSize,
  }));

  // Prepend actual start point and stub start
  canvasWaypoints[0] = { x: stubStartX, y: stubStartY };
  canvasWaypoints.unshift({ x: x1, y: y1 });

  // Append stub end and actual end point
  canvasWaypoints[canvasWaypoints.length - 1] = { x: stubEndX, y: stubEndY };
  canvasWaypoints.push({ x: x2, y: y2 });

  // Simplify: remove collinear, then smooth staircase to minimum bends
  const simplified = smoothOrthogonal(simplifyPath(canvasWaypoints), obstacles, obstaclePadding);

  // Generate smooth SVG path
  const svgPath = waypointsToSVGPath(simplified, cornerRadius);

  return {
    path: svgPath,
    waypoints: simplified,
    routed: true,
  };
}
