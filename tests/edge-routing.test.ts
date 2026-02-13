import { describe, it, expect } from 'vitest';
import {
  routeEdge,
  buildObstacleGrid,
  simplifyPath,
  waypointsToSVGPath,
} from '../src/renderer/utils/edge-routing';

describe('simplifyPath', () => {
  it('preserves start and end points for 2-point input', () => {
    const input = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ];
    const result = simplifyPath(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[1]).toEqual({ x: 100, y: 100 });
  });

  it('removes collinear horizontal points', () => {
    const input = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
    ];
    const result = simplifyPath(input);
    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
  });

  it('removes collinear vertical points', () => {
    const input = [
      { x: 0, y: 0 },
      { x: 0, y: 50 },
      { x: 0, y: 100 },
    ];
    const result = simplifyPath(input);
    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ]);
  });

  it('removes collinear diagonal points', () => {
    const input = [
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 100 },
    ];
    const result = simplifyPath(input);
    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ]);
  });

  it('preserves corner points where direction changes', () => {
    const input = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const result = simplifyPath(input);
    expect(result).toHaveLength(3);
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]);
  });

  it('handles single point', () => {
    const input = [{ x: 5, y: 5 }];
    const result = simplifyPath(input);
    expect(result).toHaveLength(1);
    expect(result).toEqual([{ x: 5, y: 5 }]);
  });

  it('handles empty array', () => {
    const input: { x: number; y: number }[] = [];
    const result = simplifyPath(input);
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('handles complex L-shaped path', () => {
    const input = [
      { x: 0, y: 0 },
      { x: 0, y: 50 },
      { x: 0, y: 100 },
      { x: 50, y: 100 },
      { x: 100, y: 100 },
    ];
    const result = simplifyPath(input);
    expect(result).toHaveLength(3);
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ]);
  });
});

describe('buildObstacleGrid', () => {
  it('creates a grid that contains source and target', () => {
    const result = buildObstacleGrid(
      0, 0,       // x1, y1
      200, 100,   // x2, y2
      [],         // obstacles
      20,         // gridSize
      10,         // obstaclePadding
      50          // boundsPadding
    );
    expect(result.cols).toBeGreaterThan(0);
    expect(result.rows).toBeGreaterThan(0);
    expect(result.grid).toBeDefined();
    expect(result.grid.width).toBe(result.cols);
    expect(result.grid.height).toBe(result.rows);
  });

  it('marks obstacle cells as unwalkable', () => {
    const gridSize = 20;
    const result = buildObstacleGrid(
      0, 0,
      200, 200,
      [{ x: 80, y: 80, w: 40, h: 40 }],
      gridSize,
      10,  // obstaclePadding
      50   // boundsPadding
    );

    // Center of obstacle at (90, 90)
    const gx = Math.floor((90 - result.offsetX) / gridSize);
    const gy = Math.floor((90 - result.offsetY) / gridSize);

    // PF.Grid uses isWalkableAt(x, y) method
    expect(result.grid.isWalkableAt(gx, gy)).toBe(false);
  });

  it('keeps source and target cells walkable even if obstacle overlaps', () => {
    const gridSize = 20;
    const sourceX = 50;
    const sourceY = 50;

    const result = buildObstacleGrid(
      sourceX, sourceY,
      200, 200,
      [{ x: 40, y: 40, w: 30, h: 30 }], // Overlaps source
      gridSize,
      10,  // obstaclePadding
      50   // boundsPadding
    );

    // Source cell
    const gx = Math.floor((sourceX - result.offsetX) / gridSize);
    const gy = Math.floor((sourceY - result.offsetY) / gridSize);

    // PF.Grid uses isWalkableAt(x, y) method
    expect(result.grid.isWalkableAt(gx, gy)).toBe(true);
  });

  it('applies obstacle padding', () => {
    const gridSize = 20;
    const padding = 20;

    const result = buildObstacleGrid(
      0, 0,
      300, 300,
      [{ x: 100, y: 100, w: 20, h: 20 }],
      gridSize,
      padding,  // obstaclePadding
      50        // boundsPadding
    );

    // Cell at (85, 85) should be unwalkable due to padding
    const gx = Math.floor((85 - result.offsetX) / gridSize);
    const gy = Math.floor((85 - result.offsetY) / gridSize);

    // PF.Grid uses isWalkableAt(x, y) method
    expect(result.grid.isWalkableAt(gx, gy)).toBe(false);
  });
});

describe('waypointsToSVGPath', () => {
  it('returns empty string for empty waypoints', () => {
    const result = waypointsToSVGPath([], 8);
    expect(result).toBe('');
  });

  it('returns empty string for single waypoint', () => {
    const result = waypointsToSVGPath([{ x: 0, y: 0 }], 8);
    expect(result).toBe('');
  });

  it('generates path with L for 2 waypoints', () => {
    const waypoints = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ];
    const result = waypointsToSVGPath(waypoints, 8);
    expect(result).toContain('M');
    expect(result).toContain('L');
  });

  it('generates path with Q curves at corners for 3+ waypoints', () => {
    const waypoints = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const result = waypointsToSVGPath(waypoints, 8);
    expect(result).toContain('M');
    expect(result).toContain('Q');
    expect(result).toContain('L');
  });
});

describe('routeEdge (integration)', () => {
  it('returns direct path when no obstacles', () => {
    const result = routeEdge(0, 0, 200, 0, []);
    expect(result.path).toBeTruthy();
    expect(result.routed).toBe(false); // No obstacles = direct fallback
  });

  it('routes around a single obstacle', () => {
    const result = routeEdge(
      0,
      50,
      300,
      50,
      [{ x: 100, y: 20, w: 100, h: 60 }]
    );

    expect(result.routed).toBe(true);
    expect(result.waypoints.length).toBeGreaterThan(2);

    // Verify intermediate waypoints don't pass through obstacle interior
    for (let i = 1; i < result.waypoints.length - 1; i++) {
      const wp = result.waypoints[i];
      const insideObstacle = wp.x > 100 && wp.x < 200 && wp.y > 20 && wp.y < 80;
      expect(insideObstacle).toBe(false);
    }
  });

  it('generates valid SVG path string', () => {
    const result = routeEdge(0, 0, 200, 0, []);
    expect(result.path).toMatch(/^M /);
  });

  it('respects custom gridSize config', () => {
    const result = routeEdge(
      0,
      0,
      200,
      0,
      [{ x: 80, y: -30, w: 40, h: 60 }],
      { gridSize: 5 }
    );
    expect(result.routed).toBe(true);
  });

  it('handles source overlapping obstacle gracefully', () => {
    const result = routeEdge(
      50,
      50,
      300,
      50,
      [{ x: 40, y: 40, w: 30, h: 30 }]
    );
    expect(result.path).toBeTruthy();
    expect(result.waypoints.length).toBeGreaterThan(0);
  });
});
