import { useState, useCallback } from 'react';
import type { OKRData } from '../../types/jira.types';

export function useOKRInlineEdit(updateOKR: (updater: (draft: OKRData) => OKRData) => void) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const startEditing = useCallback((id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingValue(currentTitle);
  }, []);

  const saveEditing = useCallback(() => {
    if (!editingId || !editingValue.trim()) {
      setEditingId(null);
      return;
    }
    const trimmed = editingValue.trim();
    updateOKR((d) => ({
      ...d,
      objectives: d.objectives.map((o) =>
        o.id === editingId ? { ...o, title: trimmed } : o,
      ),
      keyResults: d.keyResults.map((kr) =>
        kr.id === editingId ? { ...kr, title: trimmed } : kr,
      ),
    }));
    setEditingId(null);
  }, [editingId, editingValue, updateOKR]);

  return { editingId, editingValue, setEditingValue, startEditing, saveEditing, setEditingId };
}
