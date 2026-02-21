import { useState, useCallback } from 'react';
import { CARD_W, CARD_H, GROUP_HEADER_H, assignDefaultPosition, type Rect, type UpdateOKR } from './okr-canvas.types';
import { computeDeleteGroup } from '../../utils/okr-canvas-operations';
import { useUIStore } from '../../store/uiStore';

export function useGroupActions(krId: string, updateOKR: UpdateOKR) {
  const showConfirm = useUIStore((s) => s.showConfirm);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [addingSubgroupForId, setAddingSubgroupForId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupTitle, setEditingGroupTitle] = useState('');

  const handleAddGroup = useCallback((parentGroupId?: string) => {
    const title = newGroupTitle.trim();
    if (!title) return;
    updateOKR((d) => {
      if (parentGroupId) {
        // Adding subgroup inside a parent group
        const siblings = d.groups.filter((g) => g.parentGroupId === parentGroupId);
        const parentLinks = d.links.filter((l) => l.groupId === parentGroupId);
        const occupied: Rect[] = [
          ...parentLinks.map((l) => ({ x: l.x ?? 0, y: l.y ?? 0, w: CARD_W, h: CARD_H })),
          ...siblings.map((g) => ({ x: g.x ?? 0, y: g.y ?? 0, w: g.w ?? 280, h: g.h ?? 160 })),
        ];
        const defaultW = 280;
        const defaultH = 160;
        const parent = d.groups.find((g) => g.id === parentGroupId);
        const containerW = (parent?.w ?? 320) - 8; // slight padding
        const pos = assignDefaultPosition(occupied, defaultW, defaultH, containerW);
        return {
          ...d,
          groups: [
            ...d.groups,
            {
              id: crypto.randomUUID(),
              keyResultId: krId,
              parentGroupId,
              title,
              order: siblings.length,
              x: pos.x,
              y: pos.y,
              w: defaultW,
              h: defaultH,
            },
          ],
        };
      }
      // Adding top-level group (existing behavior)
      const links = d.links.filter((l) => l.keyResultId === krId);
      const grps = d.groups.filter((g) => g.keyResultId === krId && !g.parentGroupId);
      const occupied: Rect[] = [
        ...links.filter((l) => !l.groupId).map((l) => ({ x: l.x ?? 0, y: l.y ?? 0, w: CARD_W, h: CARD_H })),
        ...grps.map((g) => ({ x: g.x ?? 0, y: g.y ?? 0, w: g.w ?? 320, h: g.h ?? 200 })),
      ];
      const defaultW = 320;
      const defaultH = 200;
      const pos = assignDefaultPosition(occupied, defaultW, defaultH, 800);
      return {
        ...d,
        groups: [
          ...d.groups,
          {
            id: crypto.randomUUID(),
            keyResultId: krId,
            title,
            order: grps.length,
            x: pos.x,
            y: pos.y,
            w: defaultW,
            h: defaultH,
          },
        ],
      };
    });
    setNewGroupTitle('');
    setAddingGroup(false);
    setAddingSubgroupForId(null);
  }, [newGroupTitle, updateOKR, krId]);

  const deleteGroup = useCallback((groupId: string) => {
    showConfirm({
      title: '그룹 삭제',
      message: '이 그룹을 삭제하시겠습니까? 포함된 카드는 그룹 해제됩니다.',
      onConfirm: () => {
        updateOKR((d) => ({
          ...d,
          ...computeDeleteGroup(d, groupId),
        }));
      },
    });
  }, [updateOKR, showConfirm]);

  const renameGroup = useCallback(() => {
    if (!editingGroupId || !editingGroupTitle.trim()) {
      setEditingGroupId(null);
      return;
    }
    const trimmed = editingGroupTitle.trim();
    updateOKR((d) => ({
      ...d,
      groups: d.groups.map((g) =>
        g.id === editingGroupId ? { ...g, title: trimmed } : g,
      ),
    }));
    setEditingGroupId(null);
  }, [editingGroupId, editingGroupTitle, updateOKR]);

  return {
    addingGroup,
    newGroupTitle,
    addingSubgroupForId,
    editingGroupId,
    editingGroupTitle,
    setAddingGroup,
    setNewGroupTitle,
    setAddingSubgroupForId,
    setEditingGroupId,
    setEditingGroupTitle,
    handleAddGroup,
    deleteGroup,
    renameGroup,
  };
}
