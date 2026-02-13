import { useState, useCallback, useEffect, type RefObject } from 'react';
import type { OKRData, ConnectionEndpointType, AnchorPosition } from '../../types/jira.types';
import type { ArrowLine, UpdateOKR } from './okr-canvas.types';
import { routeEdge, buildWaypointPath, type ObstacleRect } from '../../utils/edge-routing';
import {
  getAnchorPoint,
  isRelationInKR,
  relationExists,
  type ElementRect,
} from '../../utils/anchor-points';

/** Connection source state for the two-click connection flow */
export interface ConnectFrom {
  type: ConnectionEndpointType;
  id: string;
  anchor: AnchorPosition;
}

export function useCanvasRelations(
  okr: OKRData,
  krId: string,
  zoomRef: RefObject<number>,
  updateOKR: UpdateOKR,
  canvasRef: RefObject<HTMLDivElement | null>,
) {
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState<ConnectFrom | null>(null);
  const [elementRefs] = useState(() => new Map<string, HTMLDivElement>());
  const [arrows, setArrows] = useState<ArrowLine[]>([]);

  // ── Element ref management (cards + groups) ───────────────────────────
  const setElementRef = useCallback((type: ConnectionEndpointType, id: string, el: HTMLDivElement | null) => {
    const key = `${type}:${id}`;
    if (el) {
      elementRefs.set(key, el);
    } else {
      elementRefs.delete(key);
    }
  }, [elementRefs]);

  // ── Arrow recalculation ───────────────────────────────────────────────
  const recalcArrows = useCallback(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const containerRect = canvasEl.getBoundingClientRect();
    const scaleInv = 1 / (zoomRef.current ?? 1);

    // Helper: get element rect in canvas coordinates from DOM ref
    const getElementRect = (type: ConnectionEndpointType, id: string): ElementRect | null => {
      const el = elementRefs.get(`${type}:${id}`);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: (rect.left - containerRect.left) * scaleInv,
        y: (rect.top - containerRect.top) * scaleInv,
        w: rect.width * scaleInv,
        h: rect.height * scaleInv,
      };
    };

    // Collect obstacle rects from element refs (cards + groups already registered via setElementRef)
    const obstacles: ObstacleRect[] = [];
    elementRefs.forEach((el) => {
      const rect = el.getBoundingClientRect();
      obstacles.push({
        x: (rect.left - containerRect.left) * scaleInv,
        y: (rect.top - containerRect.top) * scaleInv,
        w: rect.width * scaleInv,
        h: rect.height * scaleInv,
      });
    });

    const newArrows: ArrowLine[] = [];
    for (const rel of okr.relations) {
      // Filter to current KR
      if (!isRelationInKR(rel, okr.links, okr.groups, krId)) continue;

      const fromRect = getElementRect(rel.fromType, rel.fromId);
      const toRect = getElementRect(rel.toType, rel.toId);
      if (!fromRect || !toRect) continue;

      // Calculate anchor positions
      const startPos = getAnchorPoint(fromRect, rel.fromAnchor);
      const endPos = getAnchorPoint(toRect, rel.toAnchor);

      let path: string;
      let waypoints: { x: number; y: number }[];
      let hasManualWaypoints = false;

      if (rel.waypoints && rel.waypoints.length > 0) {
        // Manual waypoints — no A* pathfinding
        const routed = buildWaypointPath(
          startPos,
          endPos,
          rel.waypoints,
          rel.fromAnchor,
          rel.toAnchor,
        );
        path = routed.path;
        waypoints = routed.waypoints;
        hasManualWaypoints = true;
      } else {
        // A* pathfinding (existing logic) — exclude source and target from obstacles
        const edgeObstacles = obstacles.filter((o) =>
          !(Math.abs(o.x - fromRect.x) < 1 && Math.abs(o.y - fromRect.y) < 1 && Math.abs(o.w - fromRect.w) < 1 && Math.abs(o.h - fromRect.h) < 1) &&
          !(Math.abs(o.x - toRect.x) < 1 && Math.abs(o.y - toRect.y) < 1 && Math.abs(o.w - toRect.w) < 1 && Math.abs(o.h - toRect.h) < 1)
        );
        const routed = routeEdge(
          startPos.x,
          startPos.y,
          endPos.x,
          endPos.y,
          edgeObstacles,
          { fromAnchor: rel.fromAnchor, toAnchor: rel.toAnchor, fromRect, toRect },
        );
        path = routed.path;
        waypoints = routed.waypoints;
      }

      newArrows.push({
        id: rel.id,
        x1: startPos.x,
        y1: startPos.y,
        x2: endPos.x,
        y2: endPos.y,
        path,
        relationId: rel.id,
        waypoints,
        hasManualWaypoints,
      });
    }
    setArrows(newArrows);
  }, [okr.relations, okr.links, okr.groups, elementRefs, krId, zoomRef, canvasRef]);

  // Auto-recalc on data change + ResizeObserver
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      recalcArrows();
    });
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(recalcArrows);
    });
    if (canvasRef.current) {
      observer.observe(canvasRef.current);
    }
    return () => {
      cancelAnimationFrame(id);
      observer.disconnect();
    };
  }, [recalcArrows, canvasRef]);

  // ── Toggle connect mode ──────────────────────────────────────────────
  const toggleConnectMode = useCallback(() => {
    setConnectMode((prev) => !prev);
    setConnectFrom(null);
  }, []);

  // ── Handle anchor click (in connect mode) ────────────────────────────
  const handleAnchorClick = useCallback((
    type: ConnectionEndpointType,
    id: string,
    anchor: AnchorPosition,
  ) => {
    if (!connectMode) return;

    if (!connectFrom) {
      // First click — set source
      setConnectFrom({ type, id, anchor });
    } else {
      // Second click — create relation
      if (connectFrom.type === type && connectFrom.id === id) {
        // Same element clicked — cancel
        setConnectFrom(null);
        return;
      }

      const exists = relationExists(okr.relations, connectFrom.type, connectFrom.id, type, id);
      if (!exists) {
        updateOKR((d) => ({
          ...d,
          relations: [...d.relations, {
            id: crypto.randomUUID(),
            fromType: connectFrom.type,
            fromId: connectFrom.id,
            fromAnchor: connectFrom.anchor,
            toType: type,
            toId: id,
            toAnchor: anchor,
          }],
        }));
      }
      setConnectFrom(null);
      // 연결 모드 유지 — 연속으로 여러 관계를 추가할 수 있음
    }
  }, [connectMode, connectFrom, okr.relations, updateOKR]);

  // ── Delete relation ──────────────────────────────────────────────────
  const deleteRelation = useCallback((relationId: string) => {
    updateOKR((d) => ({
      ...d,
      relations: d.relations.filter((r) => r.id !== relationId),
    }));
  }, [updateOKR]);

  // ── Waypoint CRUD ────────────────────────────────────────────────────
  const addWaypoint = useCallback((relationId: string, position: { x: number; y: number }, insertIndex: number) => {
    updateOKR((d) => ({
      ...d,
      relations: d.relations.map((r) => {
        if (r.id !== relationId) return r;
        const wps = [...(r.waypoints ?? [])];
        wps.splice(insertIndex, 0, position);
        return { ...r, waypoints: wps };
      }),
    }));
  }, [updateOKR]);

  const moveWaypoint = useCallback((relationId: string, waypointIndex: number, position: { x: number; y: number }) => {
    updateOKR((d) => ({
      ...d,
      relations: d.relations.map((r) => {
        if (r.id !== relationId) return r;
        const wps = [...(r.waypoints ?? [])];
        wps[waypointIndex] = position;
        return { ...r, waypoints: wps };
      }),
    }));
  }, [updateOKR]);

  const removeWaypoint = useCallback((relationId: string, waypointIndex: number) => {
    updateOKR((d) => ({
      ...d,
      relations: d.relations.map((r) => {
        if (r.id !== relationId) return r;
        const wps = [...(r.waypoints ?? [])];
        wps.splice(waypointIndex, 1);
        return { ...r, waypoints: wps.length > 0 ? wps : undefined };
      }),
    }));
  }, [updateOKR]);

  return {
    connectMode,
    connectFrom,
    arrows,
    toggleConnectMode,
    handleAnchorClick,
    deleteRelation,
    setElementRef,
    recalcArrows,
    addWaypoint,
    moveWaypoint,
    removeWaypoint,
  };
}
