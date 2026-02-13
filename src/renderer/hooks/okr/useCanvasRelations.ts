import { useState, useCallback, useEffect, type RefObject } from 'react';
import type { OKRData } from '../../types/jira.types';
import type { ArrowLine, UpdateOKR } from './okr-canvas.types';

export function useCanvasRelations(
  okr: OKRData,
  krId: string,
  zoomRef: RefObject<number>,
  updateOKR: UpdateOKR,
  canvasRef: RefObject<HTMLDivElement | null>,
) {
  const [connectMode, setConnectMode] = useState(false);
  const [connectFromLinkId, setConnectFromLinkId] = useState<string | null>(null);
  const [cardRefs] = useState(() => new Map<string, HTMLDivElement>());
  const [arrows, setArrows] = useState<ArrowLine[]>([]);

  // ── Card ref management ─────────────────────────────────────────────────
  const setCardRef = useCallback((linkId: string, el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.set(linkId, el);
    } else {
      cardRefs.delete(linkId);
    }
  }, [cardRefs]);

  // ── Arrow recalculation ─────────────────────────────────────────────────
  const recalcArrows = useCallback(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const containerRect = canvasEl.getBoundingClientRect();
    const scaleInv = 1 / (zoomRef.current ?? 1);

    const newArrows: ArrowLine[] = [];
    for (const rel of okr.relations) {
      const fromEl = cardRefs.get(rel.fromLinkId);
      const toEl = cardRefs.get(rel.toLinkId);
      if (!fromEl || !toEl) continue;

      const fromLink = okr.links.find((l) => l.id === rel.fromLinkId);
      const toLink = okr.links.find((l) => l.id === rel.toLinkId);
      if (!fromLink || fromLink.keyResultId !== krId) continue;
      if (!toLink || toLink.keyResultId !== krId) continue;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      const x1 = (fromRect.right - containerRect.left) * scaleInv;
      const y1 = (fromRect.top + fromRect.height / 2 - containerRect.top) * scaleInv;
      const x2 = (toRect.left - containerRect.left) * scaleInv;
      const y2 = (toRect.top + toRect.height / 2 - containerRect.top) * scaleInv;

      newArrows.push({ id: rel.id, x1, y1, x2, y2, relationId: rel.id });
    }
    setArrows(newArrows);
  }, [okr.relations, okr.links, cardRefs, krId, zoomRef, canvasRef]);

  // Auto-recalc on data change + ResizeObserver
  useEffect(() => {
    // Use rAF to ensure DOM has painted with new positions before reading getBoundingClientRect
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

  // ── Toggle connect mode ──────────────────────────────────────────────────
  const toggleConnectMode = useCallback(() => {
    setConnectMode((prev) => !prev);
    setConnectFromLinkId(null);
  }, []);

  // ── Handle card click (in connect mode) ──────────────────────────────────
  const handleCardClick = useCallback((linkId: string) => {
    if (!connectMode) return;

    if (!connectFromLinkId) {
      setConnectFromLinkId(linkId);
    } else {
      if (connectFromLinkId === linkId) {
        setConnectFromLinkId(null);
        return;
      }
      const exists = okr.relations.some(
        (r) => (r.fromLinkId === connectFromLinkId && r.toLinkId === linkId) ||
               (r.fromLinkId === linkId && r.toLinkId === connectFromLinkId),
      );
      if (!exists) {
        updateOKR((d) => ({
          ...d,
          relations: [...d.relations, {
            id: crypto.randomUUID(),
            fromLinkId: connectFromLinkId,
            toLinkId: linkId,
          }],
        }));
      }
      setConnectFromLinkId(null);
      setConnectMode(false);
    }
  }, [connectMode, connectFromLinkId, okr.relations, updateOKR]);

  // ── Delete relation ──────────────────────────────────────────────────────
  const deleteRelation = useCallback((relationId: string) => {
    updateOKR((d) => ({
      ...d,
      relations: d.relations.filter((r) => r.id !== relationId),
    }));
  }, [updateOKR]);

  return {
    connectMode,
    connectFromLinkId,
    arrows,
    toggleConnectMode,
    handleCardClick,
    deleteRelation,
    setCardRef,
    recalcArrows,
  };
}
