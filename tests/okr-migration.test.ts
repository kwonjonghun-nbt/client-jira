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
  it('generates path with stubs when no manual waypoints', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 0 };

    const result = buildWaypointPath(start, end, [], 'right', 'left');

    // start → stubStart → stubEnd → end (collinear points removed by simplifyPath)
    expect(result.waypoints[0]).toEqual(start);
    expect(result.waypoints[result.waypoints.length - 1]).toEqual(end);
    expect(result.routed).toBe(false);
  });

  it('generates path through manual waypoints with stubs', () => {
    const start = { x: 0, y: 50 };
    const waypoint = { x: 50, y: 0 };
    const end = { x: 100, y: 50 };

    const result = buildWaypointPath(start, end, [waypoint], 'right', 'left');

    // Should include start, stub, waypoint, stub, end (minus collinear)
    expect(result.waypoints[0]).toEqual(start);
    expect(result.waypoints[result.waypoints.length - 1]).toEqual(end);
    expect(result.path).toBeTruthy();
  });

  it('returns routed: false (manual path, not A*)', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 100 };

    const result = buildWaypointPath(start, end, [], 'right', 'left');

    expect(result.routed).toBe(false);
  });

  it('SVG path contains M (moveto) command', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 100 };

    const result = buildWaypointPath(start, end, [], 'right', 'left');

    expect(result.path).toMatch(/^M\s/);
    expect(result.path).toContain('M 0 0');
  });

  it('uses custom corner radius when provided', () => {
    const start = { x: 0, y: 50 };
    const waypoint = { x: 50, y: 0 };
    const end = { x: 100, y: 50 };

    const result = buildWaypointPath(start, end, [waypoint], 'right', 'left', 16);

    expect(result.path).toBeTruthy();
  });

  it('uses default anchors when not specified', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 100 };

    // defaults: fromAnchor='right', toAnchor='left'
    const result = buildWaypointPath(start, end, []);

    expect(result.path).toBeTruthy();
    expect(result.routed).toBe(false);
  });
});
