import { useState, useCallback, useRef, type RefObject } from 'react';
import type { OKRGroup } from '../../types/jira.types';
import {
  CARD_W, CARD_H, GROUP_HEADER_H, DRAG_THRESHOLD, MAX_GROUP_DEPTH,
  toAbsoluteCoords, toLocalCoords, getGroupDepth, getDescendantGroupIds,
  type DragInfo, type UpdateOKR,
} from './okr-canvas.types';

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
        const groups = groupsRef.current ?? [];

        if (ds.type === 'group') {
          // ── Group drag: resolve nesting ──────────────────────────────
          const fromParentId = ds.parentGroupId;

          // Convert to canvas-absolute
          const abs = toAbsoluteCoords(ds.currentX, ds.currentY, fromParentId, groups);
          const canvasX = abs.x;
          const canvasY = abs.y;

          // Exclude self and descendants from hit-test targets
          const descendantIds = new Set(getDescendantGroupIds(ds.id, groups));
          const candidates = groups.filter(
            (g) => g.id !== ds.id && !descendantIds.has(g.id),
          );

          // Sort by depth descending (deepest first) for proper nesting priority
          const sorted = [...candidates].sort(
            (a, b) => getGroupDepth(b.id, groups) - getGroupDepth(a.id, groups),
          );

          // Hit-test: find deepest group the dragged group's center lands in
          const gw = 320; // approximate width for center calc
          const gh = 200;
          const centerX = canvasX + gw / 2;
          const centerY = canvasY + gh / 2;
          let targetGroup: OKRGroup | undefined;

          for (const g of sorted) {
            // Only allow dropping into groups that haven't reached max depth
            if (getGroupDepth(g.id, groups) >= MAX_GROUP_DEPTH) continue;

            const gAbs = toAbsoluteCoords(g.x ?? 0, g.y ?? 0, g.parentGroupId, groups);
            const gx = gAbs.x;
            const gy = gAbs.y;
            const gWidth = g.w ?? 320;
            const gHeight = g.h ?? 200;
            if (
              centerX >= gx && centerX <= gx + gWidth &&
              centerY >= gy + GROUP_HEADER_H && centerY <= gy + gHeight
            ) {
              targetGroup = g;
              break;
            }
          }

          const toParentId = targetGroup?.id;

          if (toParentId === fromParentId) {
            // Same parent — just update local position
            updateOKR((d) => ({
              ...d,
              groups: d.groups.map((g) =>
                g.id === ds.id ? { ...g, x: ds.currentX, y: ds.currentY } : g,
              ),
            }));
          } else if (toParentId) {
            // Moving into a group — convert canvas-absolute → target-group-relative
            const local = toLocalCoords(canvasX, canvasY, toParentId, groups);
            updateOKR((d) => ({
              ...d,
              groups: d.groups.map((g) =>
                g.id === ds.id
                  ? { ...g, parentGroupId: toParentId, x: Math.max(0, local.x), y: Math.max(0, local.y) }
                  : g,
              ),
            }));
          } else {
            // Moving out of a group — use canvas-absolute coords, clear parentGroupId
            updateOKR((d) => ({
              ...d,
              groups: d.groups.map((g) =>
                g.id === ds.id
                  ? { ...g, parentGroupId: undefined, x: Math.max(0, canvasX), y: Math.max(0, canvasY) }
                  : g,
              ),
            }));
          }
        } else {
          // ── Card drag: resolve group membership ──────────────────────
          const fromGroupId = ds.parentGroupId;

          // Convert card position to canvas-absolute coordinates
          const abs = toAbsoluteCoords(ds.currentX, ds.currentY, fromGroupId, groups);
          const canvasX = abs.x;
          const canvasY = abs.y;

          // Hit-test: find deepest group the card center lands in
          const centerX = canvasX + CARD_W / 2;
          const centerY = canvasY + CARD_H / 2;

          // Sort by depth descending (deepest first) so subgroups win over parent groups
          const sorted = [...groups].sort(
            (a, b) => getGroupDepth(b.id, groups) - getGroupDepth(a.id, groups),
          );

          let targetGroup: OKRGroup | undefined;
          for (const g of sorted) {
            const gAbs = toAbsoluteCoords(g.x ?? 0, g.y ?? 0, g.parentGroupId, groups);
            const gx = gAbs.x;
            const gy = gAbs.y;
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
            const local = toLocalCoords(canvasX, canvasY, toGroupId, groups);
            updateOKR((d) => ({
              ...d,
              links: d.links.map((l) =>
                l.id === ds.id ? { ...l, groupId: toGroupId, x: Math.max(0, local.x), y: Math.max(0, local.y) } : l,
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
      requestAnimationFrame(() => {
        setDragInfo(null);
      });
      if (didDrag) {
        wasDraggingRef.current = true;
        requestAnimationFrame(() => { wasDraggingRef.current = false; });
      }
    };

    isDraggingRef.current = false;
    dragRef.current = null;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [connectMode, updateOKR, recalcArrows, zoom, groupsRef]);

  return { dragInfo, startDrag, wasDraggingRef };
}
