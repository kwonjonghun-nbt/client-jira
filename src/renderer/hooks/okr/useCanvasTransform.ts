import { useState, useCallback, useEffect, type RefObject } from 'react';
import { MIN_ZOOM, MAX_ZOOM, type Rect } from './okr-canvas.types';

export function useCanvasTransform(
  viewportRef: RefObject<HTMLDivElement | null>,
  connectMode: boolean,
) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // ── Wheel zoom (cursor-anchored) ────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = viewportRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setZoom((prevZoom) => {
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom * (1 - e.deltaY * 0.001)));
      setPan((prevPan) => ({
        x: mouseX / newZoom - (mouseX / prevZoom - prevPan.x),
        y: mouseY / newZoom - (mouseY / prevZoom - prevPan.y),
      }));
      return newZoom;
    });
  }, [viewportRef]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel, viewportRef]);

  // ── Pan by dragging empty canvas ─────────────────────────────────────────
  const handlePanMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-canvas-item]')) return;
    if (connectMode) return;
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startPanX = pan.x;
    const startPanY = pan.y;
    const currentZoom = zoom;

    const onMove = (me: MouseEvent) => {
      setPan({
        x: startPanX + (me.clientX - startX) / currentZoom,
        y: startPanY + (me.clientY - startY) / currentZoom,
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pan, zoom, connectMode]);

  // ── Fit all items into viewport ──────────────────────────────────────────
  const fitToView = useCallback((items: Rect[]) => {
    if (!viewportRef.current || items.length === 0) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    const minX = Math.min(...items.map((i) => i.x));
    const minY = Math.min(...items.map((i) => i.y));
    const maxX = Math.max(...items.map((i) => i.x + i.w));
    const maxY = Math.max(...items.map((i) => i.y + i.h));

    const vp = viewportRef.current.getBoundingClientRect();
    const PAD = 60;
    const contentW = maxX - minX + PAD * 2;
    const contentH = maxY - minY + PAD * 2;

    const newZoom = Math.min(1, Math.min(vp.width / contentW, vp.height / contentH));
    const newPanX = -minX + PAD + (vp.width / newZoom - contentW + PAD * 2) / 2;
    const newPanY = -minY + PAD + (vp.height / newZoom - contentH + PAD * 2) / 2;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [viewportRef]);

  return { zoom, pan, setZoom, setPan, handlePanMouseDown, fitToView };
}
