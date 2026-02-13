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
 * Reduce an orthogonal waypoint list to the minimum number of bends.
 *
 * Walks through the simplified (collinear-removed) path and greedily extends
 * each horizontal or vertical segment as far as possible before adding a bend.
 * The result is the fewest-bend orthogonal path that passes through the
 * same start/end while keeping the same general corridor.
 */
function reduceOrthogonalBends(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length <= 3) return points;

  const result: { x: number; y: number }[] = [points[0]];

  let i = 0;
  while (i < points.length - 1) {
    const cur = points[i];
    const next = points[i + 1];

    // Determine current segment direction
    const isHoriz = Math.abs(next.y - cur.y) < 0.5;

    // Extend as far as we can in this direction
    let j = i + 1;
    while (j < points.length - 1) {
      const jNext = points[j + 1];
      const segHoriz = Math.abs(jNext.y - points[j].y) < 0.5;
      if (segHoriz !== isHoriz) break;
      j++;
    }

    // j is last point still on this axis direction
    const endOfRun = points[j];
    if (isHoriz) {
      // Keep the Y from the run start, but take the X from the run end
      result.push({ x: endOfRun.x, y: cur.y });
    } else {
      // Keep the X from the run start, but take the Y from the run end
      result.push({ x: cur.x, y: endOfRun.y });
    }

    i = j;
  }

  // Ensure the last point is exact
  const last = points[points.length - 1];
  const prev = result[result.length - 1];
  if (Math.abs(prev.x - last.x) > 0.5 || Math.abs(prev.y - last.y) > 0.5) {
    result.push(last);
  }

  return result;
}

/**
 * Calculate an obstacle-avoiding path between two points with orthogonal routing.
 *
 * Uses A* pathfinding on a grid to find a path that avoids obstacles,
 * then simplifies and smooths the result into an SVG path.
 *
 * @param x1 Source X coordinate
 * @param y1 Source Y coordinate
 * @param x2 Target X coordinate
 * @param y2 Target Y coordinate
 * @param obstacles Array of obstacle rectangles
 * @param config Optional configuration (grid size, padding, corner radius, anchors)
 * @returns Routed edge with SVG path, waypoints, and routing status
 */
/**
 * Check if a rectangle intersects the orthogonal corridor between two stub endpoints.
 * The corridor is the bounding box of the two points, expanded slightly.
 */
function obstacleInCorridor(
  stubStart: { x: number; y: number },
  stubEnd: { x: number; y: number },
  obs: ObstacleRect,
  padding: number = 5,
): boolean {
  const minX = Math.min(stubStart.x, stubEnd.x) - padding;
  const maxX = Math.max(stubStart.x, stubEnd.x) + padding;
  const minY = Math.min(stubStart.y, stubEnd.y) - padding;
  const maxY = Math.max(stubStart.y, stubEnd.y) + padding;

  // Standard AABB intersection test
  return obs.x < maxX && obs.x + obs.w > minX && obs.y < maxY && obs.y + obs.h > minY;
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

  // If no obstacles, return orthogonal path
  if (obstacles.length === 0) {
    return createOrthogonalPath(x1, y1, x2, y2, fromAnchor, toAnchor, stubLength, fromRect, toRect);
  }

  // Check if any obstacle actually blocks the corridor between stubs
  const fromDir = getStubDirection(fromAnchor);
  const toDir = getStubDirection(toAnchor);
  const corridorStart = { x: x1 + fromDir.dx * stubLength, y: y1 + fromDir.dy * stubLength };
  const corridorEnd = { x: x2 + toDir.dx * stubLength, y: y2 + toDir.dy * stubLength };
  const hasBlockingObstacle = obstacles.some((o) => obstacleInCorridor(corridorStart, corridorEnd, o, obstaclePadding));

  if (!hasBlockingObstacle) {
    // No obstacle in the way — use clean orthogonal path
    return createOrthogonalPath(x1, y1, x2, y2, fromAnchor, toAnchor, stubLength, fromRect, toRect);
  }

  // Reuse stub endpoints for A* pathfinding
  const stubStartX = corridorStart.x;
  const stubStartY = corridorStart.y;
  const stubEndX = corridorEnd.x;
  const stubEndY = corridorEnd.y;

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

  // Simplify: remove collinear, then reduce staircase bends to minimum
  const simplified = reduceOrthogonalBends(simplifyPath(canvasWaypoints));

  // Generate smooth SVG path
  const svgPath = waypointsToSVGPath(simplified, cornerRadius);

  return {
    path: svgPath,
    waypoints: simplified,
    routed: true,
  };
}
