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
 * For 2 waypoints (direct): uses cubic bezier curve.
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
    // Direct path with cubic bezier
    const [p1, p2] = waypoints;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const cx1 = p1.x + dx * 0.25;
    const cy1 = p1.y + dy * 0.25;
    const cx2 = p1.x + dx * 0.75;
    const cy2 = p1.y + dy * 0.75;

    return `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`;
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
 * Build SVG path through user-defined manual waypoints.
 * Used when a relation has manually placed bend points instead of A* routing.
 *
 * @param start Anchor start point (canvas coordinates)
 * @param end Anchor end point (canvas coordinates)
 * @param waypoints User-defined bend points (canvas coordinates)
 * @param cornerRadius Corner radius for rounded bends (default: 8)
 */
export function buildWaypointPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  waypoints: { x: number; y: number }[],
  cornerRadius: number = 8,
): RoutedEdge {
  const allPoints = [start, ...waypoints, end];
  const svgPath = waypointsToSVGPath(allPoints, cornerRadius);
  return {
    path: svgPath,
    waypoints: allPoints,
    routed: false,
  };
}

/**
 * Create direct cubic bezier fallback path.
 * Used when pathfinding fails or no obstacles are present.
 */
function createDirectPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): RoutedEdge {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx1 = x1 + dx * 0.25;
  const cy1 = y1 + dy * 0.25;
  const cx2 = x1 + dx * 0.75;
  const cy2 = y1 + dy * 0.75;

  return {
    path: `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`,
    waypoints: [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ],
    routed: false,
  };
}

/**
 * Calculate an obstacle-avoiding path between two points.
 *
 * Uses A* pathfinding on a grid to find a path that avoids obstacles,
 * then simplifies and smooths the result into an SVG path.
 *
 * @param x1 Source X coordinate
 * @param y1 Source Y coordinate
 * @param x2 Target X coordinate
 * @param y2 Target Y coordinate
 * @param obstacles Array of obstacle rectangles
 * @param config Optional configuration (grid size, padding, corner radius)
 * @returns Routed edge with SVG path, waypoints, and routing status
 */
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

  // If no obstacles, return direct path
  if (obstacles.length === 0) {
    return createDirectPath(x1, y1, x2, y2);
  }

  // Build grid with obstacles
  const { grid, offsetX, offsetY, cols, rows } = buildObstacleGrid(
    x1,
    y1,
    x2,
    y2,
    obstacles,
    gridSize,
    obstaclePadding,
    boundsPadding,
  );

  // Convert source and target to grid coordinates
  const startCol = Math.floor((x1 - offsetX) / gridSize);
  const startRow = Math.floor((y1 - offsetY) / gridSize);
  const endCol = Math.floor((x2 - offsetX) / gridSize);
  const endRow = Math.floor((y2 - offsetY) / gridSize);

  // Validate coordinates are within grid
  if (
    startCol < 0 || startCol >= cols ||
    startRow < 0 || startRow >= rows ||
    endCol < 0 || endCol >= cols ||
    endRow < 0 || endRow >= rows
  ) {
    // Out of bounds, use direct path
    return createDirectPath(x1, y1, x2, y2);
  }

  // Run A* pathfinding
  const finder = new PF.AStarFinder({
    allowDiagonal: true,
    dontCrossCorners: true,
  });

  const gridPath = finder.findPath(startCol, startRow, endCol, endRow, grid);

  // Check if path was found
  if (gridPath.length === 0) {
    // No path found, use direct fallback
    return createDirectPath(x1, y1, x2, y2);
  }

  // Convert grid path to canvas coordinates
  const canvasWaypoints = gridPath.map(([col, row]) => ({
    x: offsetX + col * gridSize,
    y: offsetY + row * gridSize,
  }));

  // Use exact start and end points (not grid-snapped)
  canvasWaypoints[0] = { x: x1, y: y1 };
  canvasWaypoints[canvasWaypoints.length - 1] = { x: x2, y: y2 };

  // Simplify path to remove collinear points
  const simplified = simplifyPath(canvasWaypoints);

  // Generate smooth SVG path
  const svgPath = waypointsToSVGPath(simplified, cornerRadius);

  return {
    path: svgPath,
    waypoints: simplified,
    routed: true,
  };
}
