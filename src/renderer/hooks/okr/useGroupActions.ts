import { useState, useCallback } from 'react';
import { CARD_W, CARD_H, assignDefaultPosition, type Rect, type UpdateOKR } from './okr-canvas.types';

export function useGroupActions(krId: string, updateOKR: UpdateOKR) {
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupTitle, setEditingGroupTitle] = useState('');

  const handleAddGroup = useCallback(() => {
    const title = newGroupTitle.trim();
    if (!title) return;
    updateOKR((d) => {
      const links = d.links.filter((l) => l.keyResultId === krId);
      const grps = d.groups.filter((g) => g.keyResultId === krId);
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
  }, [newGroupTitle, updateOKR, krId]);

  const deleteGroup = useCallback((groupId: string) => {
    if (!window.confirm('이 그룹을 삭제하시겠습니까? 포함된 카드는 그룹 해제됩니다.')) return;
    updateOKR((d) => ({
      ...d,
      groups: d.groups.filter((g) => g.id !== groupId),
      links: d.links.map((l) =>
        l.groupId === groupId ? { ...l, groupId: undefined } : l,
      ),
    }));
  }, [updateOKR]);

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
    editingGroupId,
    editingGroupTitle,
    setAddingGroup,
    setNewGroupTitle,
    setEditingGroupId,
    setEditingGroupTitle,
    handleAddGroup,
    deleteGroup,
    renameGroup,
  };
}
