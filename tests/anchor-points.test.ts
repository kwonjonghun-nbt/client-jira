import { describe, it, expect } from 'vitest';
import {
  getAnchorPoint,
  getAnchorOffset,
  findNearestAnchor,
  suggestAnchorPair,
  relationExists,
  isRelationInKR,
  filterRelationsExcluding,
  findBestInsertIndex,
  type ElementRect,
} from '../src/renderer/utils/anchor-points';
import type { AnchorPosition, OKRRelation, OKRLink, OKRGroup } from '../src/renderer/types/jira.types';

describe('anchor-points utilities', () => {
  const sampleRect: ElementRect = { x: 100, y: 200, w: 80, h: 60 };

  describe('getAnchorPoint', () => {
    it('returns top anchor at center-top of rect', () => {
      expect(getAnchorPoint(sampleRect, 'top')).toEqual({ x: 140, y: 200 });
    });

    it('returns bottom anchor at center-bottom of rect', () => {
      expect(getAnchorPoint(sampleRect, 'bottom')).toEqual({ x: 140, y: 260 });
    });

    it('returns left anchor at left-center of rect', () => {
      expect(getAnchorPoint(sampleRect, 'left')).toEqual({ x: 100, y: 230 });
    });

    it('returns right anchor at right-center of rect', () => {
      expect(getAnchorPoint(sampleRect, 'right')).toEqual({ x: 180, y: 230 });
    });
  });

  describe('getAnchorOffset', () => {
    it('returns CSS offset for top anchor', () => {
      expect(getAnchorOffset('top')).toEqual({ left: '50%', top: '0%' });
    });

    it('returns CSS offset for bottom anchor', () => {
      expect(getAnchorOffset('bottom')).toEqual({ left: '50%', top: '100%' });
    });

    it('returns CSS offset for left anchor', () => {
      expect(getAnchorOffset('left')).toEqual({ left: '0%', top: '50%' });
    });

    it('returns CSS offset for right anchor', () => {
      expect(getAnchorOffset('right')).toEqual({ left: '100%', top: '50%' });
    });
  });

  describe('findNearestAnchor', () => {
    it('finds top anchor when point is above rect', () => {
      const point = { x: 140, y: 150 };
      expect(findNearestAnchor(sampleRect, point)).toBe('top');
    });

    it('finds bottom anchor when point is below rect', () => {
      const point = { x: 140, y: 300 };
      expect(findNearestAnchor(sampleRect, point)).toBe('bottom');
    });

    it('finds left anchor when point is to the left', () => {
      const point = { x: 50, y: 230 };
      expect(findNearestAnchor(sampleRect, point)).toBe('left');
    });

    it('finds right anchor when point is to the right', () => {
      const point = { x: 250, y: 230 };
      expect(findNearestAnchor(sampleRect, point)).toBe('right');
    });

    it('finds nearest anchor for diagonal point', () => {
      const point = { x: 200, y: 150 };
      const nearest = findNearestAnchor(sampleRect, point);
      expect(['top', 'right']).toContain(nearest);
    });
  });

  describe('suggestAnchorPair', () => {
    it('suggests right→left for horizontal layout (target to the right)', () => {
      const fromRect: ElementRect = { x: 100, y: 200, w: 80, h: 60 };
      const toRect: ElementRect = { x: 300, y: 200, w: 80, h: 60 };
      expect(suggestAnchorPair(fromRect, toRect)).toEqual({
        fromAnchor: 'right',
        toAnchor: 'left',
      });
    });

    it('suggests left→right for horizontal layout (target to the left)', () => {
      const fromRect: ElementRect = { x: 300, y: 200, w: 80, h: 60 };
      const toRect: ElementRect = { x: 100, y: 200, w: 80, h: 60 };
      expect(suggestAnchorPair(fromRect, toRect)).toEqual({
        fromAnchor: 'left',
        toAnchor: 'right',
      });
    });

    it('suggests bottom→top for vertical layout (target below)', () => {
      const fromRect: ElementRect = { x: 100, y: 100, w: 80, h: 60 };
      const toRect: ElementRect = { x: 100, y: 300, w: 80, h: 60 };
      expect(suggestAnchorPair(fromRect, toRect)).toEqual({
        fromAnchor: 'bottom',
        toAnchor: 'top',
      });
    });

    it('suggests top→bottom for vertical layout (target above)', () => {
      const fromRect: ElementRect = { x: 100, y: 300, w: 80, h: 60 };
      const toRect: ElementRect = { x: 100, y: 100, w: 80, h: 60 };
      expect(suggestAnchorPair(fromRect, toRect)).toEqual({
        fromAnchor: 'top',
        toAnchor: 'bottom',
      });
    });

    it('prefers horizontal when dx and dy are equal', () => {
      const fromRect: ElementRect = { x: 100, y: 100, w: 80, h: 60 };
      const toRect: ElementRect = { x: 200, y: 200, w: 80, h: 60 };
      const result = suggestAnchorPair(fromRect, toRect);
      expect(result).toEqual({
        fromAnchor: 'right',
        toAnchor: 'left',
      });
    });
  });

  describe('relationExists', () => {
    const relations: OKRRelation[] = [
      {
        id: 'rel-1',
        fromType: 'link',
        fromId: 'link-a',
        fromAnchor: 'right',
        toType: 'link',
        toId: 'link-b',
        toAnchor: 'left',
      },
      {
        id: 'rel-2',
        fromType: 'group',
        fromId: 'group-x',
        fromAnchor: 'bottom',
        toType: 'link',
        toId: 'link-c',
        toAnchor: 'top',
      },
    ];

    it('returns true when exact match exists', () => {
      expect(relationExists(relations, 'link', 'link-a', 'link', 'link-b')).toBe(true);
    });

    it('returns true when reverse match exists', () => {
      expect(relationExists(relations, 'link', 'link-b', 'link', 'link-a')).toBe(true);
    });

    it('returns true for mixed-type relation', () => {
      expect(relationExists(relations, 'group', 'group-x', 'link', 'link-c')).toBe(true);
    });

    it('returns true for reverse mixed-type relation', () => {
      expect(relationExists(relations, 'link', 'link-c', 'group', 'group-x')).toBe(true);
    });

    it('returns false when no match exists', () => {
      expect(relationExists(relations, 'link', 'link-a', 'link', 'link-z')).toBe(false);
    });

    it('returns false for empty relations array', () => {
      expect(relationExists([], 'link', 'link-a', 'link', 'link-b')).toBe(false);
    });
  });

  describe('isRelationInKR', () => {
    const links: OKRLink[] = [
      { id: 'link-1', keyResultId: 'kr-alpha', type: 'jira' as const, issueKey: 'PROJ-1', order: 0 },
      { id: 'link-2', keyResultId: 'kr-alpha', type: 'jira' as const, issueKey: 'PROJ-2', order: 1 },
      { id: 'link-3', keyResultId: 'kr-beta', type: 'jira' as const, issueKey: 'PROJ-3', order: 0 },
    ];

    const groups: OKRGroup[] = [
      { id: 'group-1', keyResultId: 'kr-alpha', title: 'Group A', order: 0 },
      { id: 'group-2', keyResultId: 'kr-beta', title: 'Group B', order: 0 },
    ];

    it('returns true when both link endpoints are in KR', () => {
      const rel: OKRRelation = {
        id: 'rel-1',
        fromType: 'link',
        fromId: 'link-1',
        fromAnchor: 'right',
        toType: 'link',
        toId: 'link-2',
        toAnchor: 'left',
      };
      expect(isRelationInKR(rel, links, groups, 'kr-alpha')).toBe(true);
    });

    it('returns true when both group endpoints are in KR', () => {
      const rel: OKRRelation = {
        id: 'rel-2',
        fromType: 'group',
        fromId: 'group-1',
        fromAnchor: 'right',
        toType: 'group',
        toId: 'group-1',
        toAnchor: 'left',
      };
      expect(isRelationInKR(rel, links, groups, 'kr-alpha')).toBe(true);
    });

    it('returns true when link→group both in KR', () => {
      const rel: OKRRelation = {
        id: 'rel-3',
        fromType: 'link',
        fromId: 'link-1',
        fromAnchor: 'bottom',
        toType: 'group',
        toId: 'group-1',
        toAnchor: 'top',
      };
      expect(isRelationInKR(rel, links, groups, 'kr-alpha')).toBe(true);
    });

    it('returns false when fromId is in different KR', () => {
      const rel: OKRRelation = {
        id: 'rel-4',
        fromType: 'link',
        fromId: 'link-3',
        fromAnchor: 'right',
        toType: 'link',
        toId: 'link-1',
        toAnchor: 'left',
      };
      expect(isRelationInKR(rel, links, groups, 'kr-alpha')).toBe(false);
    });

    it('returns false when toId is in different KR', () => {
      const rel: OKRRelation = {
        id: 'rel-5',
        fromType: 'link',
        fromId: 'link-1',
        fromAnchor: 'right',
        toType: 'link',
        toId: 'link-3',
        toAnchor: 'left',
      };
      expect(isRelationInKR(rel, links, groups, 'kr-alpha')).toBe(false);
    });

    it('returns false when both endpoints are in different KR', () => {
      const rel: OKRRelation = {
        id: 'rel-6',
        fromType: 'link',
        fromId: 'link-3',
        fromAnchor: 'right',
        toType: 'group',
        toId: 'group-2',
        toAnchor: 'left',
      };
      expect(isRelationInKR(rel, links, groups, 'kr-alpha')).toBe(false);
    });

    it('returns false when endpoint IDs do not exist', () => {
      const rel: OKRRelation = {
        id: 'rel-7',
        fromType: 'link',
        fromId: 'nonexistent',
        fromAnchor: 'right',
        toType: 'link',
        toId: 'link-1',
        toAnchor: 'left',
      };
      expect(isRelationInKR(rel, links, groups, 'kr-alpha')).toBe(false);
    });
  });

  describe('filterRelationsExcluding', () => {
    const relations: OKRRelation[] = [
      {
        id: 'rel-1',
        fromType: 'link',
        fromId: 'link-a',
        fromAnchor: 'right',
        toType: 'link',
        toId: 'link-b',
        toAnchor: 'left',
      },
      {
        id: 'rel-2',
        fromType: 'link',
        fromId: 'link-c',
        fromAnchor: 'right',
        toType: 'group',
        toId: 'group-x',
        toAnchor: 'left',
      },
      {
        id: 'rel-3',
        fromType: 'group',
        fromId: 'group-y',
        fromAnchor: 'bottom',
        toType: 'link',
        toId: 'link-d',
        toAnchor: 'top',
      },
    ];

    it('excludes relations with fromId in exclude set', () => {
      const result = filterRelationsExcluding(relations, 'link', new Set(['link-a']));
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(['rel-2', 'rel-3']);
    });

    it('excludes relations with toId in exclude set', () => {
      const result = filterRelationsExcluding(relations, 'link', new Set(['link-b']));
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(['rel-2', 'rel-3']);
    });

    it('excludes relations with either endpoint in exclude set', () => {
      const result = filterRelationsExcluding(relations, 'link', new Set(['link-a', 'link-d']));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rel-2');
    });

    it('excludes group endpoints when excludeType is group', () => {
      const result = filterRelationsExcluding(relations, 'group', new Set(['group-x']));
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(['rel-1', 'rel-3']);
    });

    it('keeps all relations when exclude set is empty', () => {
      const result = filterRelationsExcluding(relations, 'link', new Set());
      expect(result).toHaveLength(3);
    });

    it('keeps relations when excludeType does not match', () => {
      const result = filterRelationsExcluding(relations, 'group', new Set(['link-a']));
      expect(result).toHaveLength(3);
    });
  });

  describe('findBestInsertIndex', () => {
    it('returns 0 for path with fewer than 2 waypoints', () => {
      expect(findBestInsertIndex({ x: 100, y: 100 }, [])).toBe(0);
      expect(findBestInsertIndex({ x: 100, y: 100 }, [{ x: 0, y: 0 }])).toBe(0);
    });

    it('finds closest segment for point near start', () => {
      const path = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 200, y: 0 },
      ];
      const point = { x: 50, y: 10 };
      expect(findBestInsertIndex(point, path)).toBe(0);
    });

    it('finds closest segment for point near middle', () => {
      const path = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 200, y: 0 },
      ];
      const point = { x: 150, y: 10 };
      expect(findBestInsertIndex(point, path)).toBe(1);
    });

    it('finds closest segment for point near end', () => {
      const path = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 200, y: 0 },
        { x: 300, y: 0 },
      ];
      const point = { x: 250, y: 10 };
      expect(findBestInsertIndex(point, path)).toBe(2);
    });

    it('handles vertical path segments', () => {
      const path = [
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 100, y: 200 },
      ];
      const point = { x: 90, y: 150 };
      expect(findBestInsertIndex(point, path)).toBe(1);
    });

    it('handles diagonal path segments', () => {
      const path = [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        { x: 200, y: 200 },
      ];
      const point = { x: 50, y: 60 };
      expect(findBestInsertIndex(point, path)).toBe(0);
    });

    it('handles point exactly on a segment', () => {
      const path = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 200, y: 0 },
      ];
      const point = { x: 50, y: 0 };
      expect(findBestInsertIndex(point, path)).toBe(0);
    });
  });
});
