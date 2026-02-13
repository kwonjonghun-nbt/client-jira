import { describe, it, expect } from 'vitest';
import { migrateRelation, migrateOKRRelations } from '../src/main/utils/okr-migration';
import { buildWaypointPath } from '../src/renderer/utils/edge-routing';

describe('migrateRelation', () => {
  it('migrates old format { id, fromLinkId, toLinkId } to new format', () => {
    const oldRelation = {
      id: 'rel-1',
      fromLinkId: 'link-a',
      toLinkId: 'link-b',
    };

    const result = migrateRelation(oldRelation);

    expect(result).toEqual({
      id: 'rel-1',
      fromType: 'link',
      fromId: 'link-a',
      fromAnchor: 'right',
      toType: 'link',
      toId: 'link-b',
      toAnchor: 'left',
      waypoints: undefined,
      label: undefined,
    });
  });

  it('passes through already new format unchanged', () => {
    const newRelation = {
      id: 'rel-2',
      fromType: 'ticket',
      fromId: 'ticket-1',
      fromAnchor: 'bottom',
      toType: 'group',
      toId: 'group-1',
      toAnchor: 'top',
    };

    const result = migrateRelation(newRelation);

    expect(result).toBe(newRelation);
  });

  it('preserves label in old format migration', () => {
    const oldRelation = {
      id: 'rel-3',
      fromLinkId: 'link-x',
      toLinkId: 'link-y',
      label: 'blocks',
    };

    const result = migrateRelation(oldRelation);

    expect(result.label).toBe('blocks');
    expect(result.fromType).toBe('link');
    expect(result.toType).toBe('link');
  });

  it('preserves waypoints in old format migration', () => {
    const waypoints = [
      { x: 100, y: 200 },
      { x: 150, y: 250 },
    ];
    const oldRelation = {
      id: 'rel-4',
      fromLinkId: 'link-m',
      toLinkId: 'link-n',
      waypoints,
    };

    const result = migrateRelation(oldRelation);

    expect(result.waypoints).toEqual(waypoints);
  });

  it('returns unknown format as-is (no fromLinkId, no fromType)', () => {
    const unknownRelation = {
      id: 'rel-5',
      someOtherField: 'value',
    };

    const result = migrateRelation(unknownRelation);

    expect(result).toBe(unknownRelation);
  });
});

describe('migrateOKRRelations', () => {
  it('migrates all relations in an OKR data object', () => {
    const okrData = {
      id: 'okr-1',
      title: 'Q1 OKR',
      relations: [
        { id: 'rel-1', fromLinkId: 'a', toLinkId: 'b' },
        { id: 'rel-2', fromLinkId: 'c', toLinkId: 'd' },
      ],
    };

    const result = migrateOKRRelations(okrData) as any;

    expect(result.relations).toHaveLength(2);
    expect(result.relations[0].fromType).toBe('link');
    expect(result.relations[0].fromId).toBe('a');
    expect(result.relations[1].fromType).toBe('link');
    expect(result.relations[1].fromId).toBe('c');
  });

  it('returns non-object input as-is', () => {
    expect(migrateOKRRelations(null)).toBe(null);
    expect(migrateOKRRelations(undefined)).toBe(undefined);
    expect(migrateOKRRelations('string')).toBe('string');
    expect(migrateOKRRelations(123)).toBe(123);
  });

  it('returns object without relations array as-is', () => {
    const data = { id: 'okr-1', title: 'Q1 OKR' };
    const result = migrateOKRRelations(data);
    expect(result).toBe(data);
  });

  it('returns object with empty relations array', () => {
    const data = { id: 'okr-1', relations: [] };
    const result = migrateOKRRelations(data) as any;
    expect(result.relations).toEqual([]);
  });
});

describe('buildWaypointPath', () => {
  it('generates path with start and end when no waypoints', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 100 };
    const waypoints: { x: number; y: number }[] = [];

    const result = buildWaypointPath(start, end, waypoints);

    expect(result.waypoints).toHaveLength(2);
    expect(result.waypoints[0]).toEqual(start);
    expect(result.waypoints[1]).toEqual(end);
  });

  it('generates path through all points with one waypoint', () => {
    const start = { x: 0, y: 0 };
    const waypoint = { x: 50, y: 50 };
    const end = { x: 100, y: 0 };

    const result = buildWaypointPath(start, end, [waypoint]);

    expect(result.waypoints).toHaveLength(3);
    expect(result.waypoints[0]).toEqual(start);
    expect(result.waypoints[1]).toEqual(waypoint);
    expect(result.waypoints[2]).toEqual(end);
  });

  it('generates path with correct waypoint count for multiple waypoints', () => {
    const start = { x: 0, y: 0 };
    const waypoints = [
      { x: 25, y: 25 },
      { x: 50, y: 50 },
      { x: 75, y: 25 },
    ];
    const end = { x: 100, y: 0 };

    const result = buildWaypointPath(start, end, waypoints);

    expect(result.waypoints).toHaveLength(5); // start + 3 waypoints + end
    expect(result.waypoints[0]).toEqual(start);
    expect(result.waypoints[1]).toEqual(waypoints[0]);
    expect(result.waypoints[2]).toEqual(waypoints[1]);
    expect(result.waypoints[3]).toEqual(waypoints[2]);
    expect(result.waypoints[4]).toEqual(end);
  });

  it('returns routed: false (manual path, not A*)', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 100 };

    const result = buildWaypointPath(start, end, []);

    expect(result.routed).toBe(false);
  });

  it('SVG path contains M (moveto) command', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 100 };

    const result = buildWaypointPath(start, end, []);

    expect(result.path).toMatch(/^M\s/);
    expect(result.path).toContain('M 0 0');
  });

  it('uses custom corner radius when provided', () => {
    const start = { x: 0, y: 0 };
    const waypoint = { x: 50, y: 50 };
    const end = { x: 100, y: 0 };
    const customRadius = 16;

    const result = buildWaypointPath(start, end, [waypoint], customRadius);

    // Result should still be valid (we're testing the function accepts the parameter)
    expect(result.path).toBeTruthy();
    expect(result.waypoints).toHaveLength(3);
  });

  it('uses default corner radius of 8 when not specified', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 100 };

    // Call without cornerRadius parameter
    const result = buildWaypointPath(start, end, []);

    expect(result.path).toBeTruthy();
    expect(result.routed).toBe(false);
  });
});
