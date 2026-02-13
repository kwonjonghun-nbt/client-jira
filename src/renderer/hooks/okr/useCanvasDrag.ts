import { useState, useCallback, useRef, type RefObject } from 'react';
import type { OKRGroup } from '../../types/jira.types';
import { CARD_W, CARD_H, GROUP_HEADER_H, DRAG_THRESHOLD, type DragInfo, type UpdateOKR } from './okr-canvas.types';

export function useCanvasDrag(
  zoom: number,
  updateOKR: UpdateOKR,
  recalcArrows: () => void,
  connectMode: boolean,
  groupsRef: RefObject<OKRGroup[]>,
) {
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const dragRef = useRef<DragInfo | null>(null);
  const isDraggingRef = useRef(false);
  const wasDraggingRef = useRef(false);

  const startDrag = useCallback((
    e: React.MouseEvent,
    type: 'card' | 'group',
    id: string,
    itemX: number,
    itemY: number,
    parentGroupId?: string,
  ) => {
    if (connectMode) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) return;

    e.preventDefault();
    e.stopPropagation();
    const mx = e.clientX;
    const my = e.clientY;

    const onMove = (moveE: MouseEvent) => {
      const dx = (moveE.clientX - mx) / zoom;
      const dy = (moveE.clientY - my) / zoom;
      if (!isDraggingRef.current) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        isDraggingRef.current = true;
      }
      const rawX = itemX + dx;
      const rawY = itemY + dy;
      // Cards inside groups need negative coords to drag outside the group area.
      // Only clamp ungrouped cards and groups to canvas origin (0,0).
      const newX = parentGroupId ? rawX : Math.max(0, rawX);
      const newY = parentGroupId ? rawY : Math.max(0, rawY);
      const info: DragInfo = {
        type, id, parentGroupId,
        startMouseX: mx, startMouseY: my,
        startItemX: itemX, startItemY: itemY,
        currentX: newX, currentY: newY,
      };
      dragRef.current = info;
      requestAnimationFrame(() => {
        setDragInfo(dragRef.current);
        recalcArrows();
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const ds = dragRef.current;
      if (ds && isDraggingRef.current) {
        if (ds.type === 'group') {
          // Group drag — just update position
          updateOKR((d) => ({
            ...d,
            groups: d.groups.map((g) =>
              g.id === ds.id ? { ...g, x: ds.currentX, y: ds.currentY } : g,
            ),
          }));
        } else {
          // Card drag — resolve group membership based on drop position
          const groups = groupsRef.current ?? [];
          const fromGroupId = ds.parentGroupId;

          // Convert card position to canvas-absolute coordinates
          let canvasX = ds.currentX;
          let canvasY = ds.currentY;
          if (fromGroupId) {
            const fromGroup = groups.find((g) => g.id === fromGroupId);
            if (fromGroup) {
              canvasX += (fromGroup.x ?? 0);
              canvasY += (fromGroup.y ?? 0) + GROUP_HEADER_H;
            }
          }

          // Hit-test: find which group (if any) the card center lands in
          const centerX = canvasX + CARD_W / 2;
          const centerY = canvasY + CARD_H / 2;
          let targetGroup: OKRGroup | undefined;
          for (const g of groups) {
            const gx = g.x ?? 0;
            const gy = g.y ?? 0;
            const gw = g.w ?? 320;
            const gh = g.h ?? 200;
            if (centerX >= gx && centerX <= gx + gw && centerY >= gy + GROUP_HEADER_H && centerY <= gy + gh) {
              targetGroup = g;
              break;
            }
          }

          const toGroupId = targetGroup?.id;

          if (toGroupId === fromGroupId) {
            // Same group (or both ungrouped) — just update local position
            updateOKR((d) => ({
              ...d,
              links: d.links.map((l) =>
                l.id === ds.id ? { ...l, x: ds.currentX, y: ds.currentY } : l,
              ),
            }));
          } else if (toGroupId) {
            // Moving into a group — convert canvas-absolute → group-relative
            const relX = canvasX - (targetGroup!.x ?? 0);
            const relY = canvasY - (targetGroup!.y ?? 0) - GROUP_HEADER_H;
            updateOKR((d) => ({
              ...d,
              links: d.links.map((l) =>
                l.id === ds.id ? { ...l, groupId: toGroupId, x: Math.max(0, relX), y: Math.max(0, relY) } : l,
              ),
            }));
          } else {
            // Moving out of a group — use canvas-absolute coords, clear groupId
            updateOKR((d) => ({
              ...d,
              links: d.links.map((l) =>
                l.id === ds.id ? { ...l, groupId: undefined, x: canvasX, y: canvasY } : l,
              ),
            }));
          }
        }
      }
      const didDrag = isDraggingRef.current;
      dragRef.current = null;
      isDraggingRef.current = false;
      // Defer clearing dragInfo so updateOKR's new data renders first,
      // preventing the card from briefly snapping back to its old position.
      requestAnimationFrame(() => {
        setDragInfo(null);
      });
      // Flag so click handlers can skip (e.g. don't open detail modal after drag)
      if (didDrag) {
        wasDraggingRef.current = true;
        requestAnimationFrame(() => { wasDraggingRef.current = false; });
      }
      // Arrow recalc is handled by useEffect reacting to okr.links/okr.groups data changes
    };

    isDraggingRef.current = false;
    dragRef.current = null;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [connectMode, updateOKR, recalcArrows, zoom, groupsRef]);

  return { dragInfo, startDrag, wasDraggingRef };
}
