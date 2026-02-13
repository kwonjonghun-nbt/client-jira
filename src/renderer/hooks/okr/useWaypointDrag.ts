import { useState, useCallback, type RefObject } from 'react';

interface WaypointDragState {
  relationId: string;
  waypointIndex: number;
}

export function useWaypointDrag(
  zoom: number,
  canvasRef: RefObject<HTMLDivElement | null>,
  moveWaypoint: (relationId: string, index: number, pos: { x: number; y: number }) => void,
) {
  const [dragging, setDragging] = useState<WaypointDragState | null>(null);

  const startWaypointDrag = useCallback((
    e: React.MouseEvent,
    relationId: string,
    waypointIndex: number,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging({ relationId, waypointIndex });

    const onMove = (me: MouseEvent) => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      const scaleInv = 1 / zoom;
      const x = (me.clientX - rect.left) * scaleInv;
      const y = (me.clientY - rect.top) * scaleInv;
      moveWaypoint(relationId, waypointIndex, { x, y });
    };

    const onUp = () => {
      setDragging(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [zoom, canvasRef, moveWaypoint]);

  return { dragging, startWaypointDrag };
}
