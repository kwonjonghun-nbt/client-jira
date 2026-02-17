import { useState, useCallback, useRef, useEffect } from 'react';
import type { OKRData } from '../types/jira.types';
import {
  CARD_W,
  CARD_H,
  assignDefaultPosition,
  type Rect,
} from './okr/okr-canvas.types';

const emptyOKR: OKRData = {
  objectives: [],
  keyResults: [],
  virtualTickets: [],
  links: [],
  groups: [],
  relations: [],
  updatedAt: new Date().toISOString(),
};

export function useOKRActions(
  data: OKRData | null | undefined,
  save: (data: OKRData) => void,
) {
  const okr = data ?? emptyOKR;

  // ── Local UI state ────────────────────────────────────────────────────────
  const [collapsedObjectives, setCollapsedObjectives] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Collapse all objectives on first data load
  useEffect(() => {
    if (!initializedRef.current && okr.objectives.length > 0) {
      initializedRef.current = true;
      setCollapsedObjectives(new Set(okr.objectives.map((o) => o.id)));
    }
  }, [okr.objectives]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [addingObjective, setAddingObjective] = useState(false);
  const [newObjectiveTitle, setNewObjectiveTitle] = useState('');
  const [addingKRForObjective, setAddingKRForObjective] = useState<string | null>(null);
  const [newKRTitle, setNewKRTitle] = useState('');
  const [linkModalKRId, setLinkModalKRId] = useState<string | null>(null);
  const [canvasKRId, setCanvasKRId] = useState<string | null>(null);

  // ── OKR update helper ─────────────────────────────────────────────────────
  const updateOKR = useCallback(
    (updater: (draft: OKRData) => OKRData) => {
      const current = data ?? emptyOKR;
      const updated = updater({ ...current });
      updated.updatedAt = new Date().toISOString();
      save(updated);
    },
    [data, save],
  );

  // ── CRUD: Objectives ──────────────────────────────────────────────────────
  const addObjective = useCallback(() => {
    const title = newObjectiveTitle.trim();
    if (!title) return;
    updateOKR((d) => ({
      ...d,
      objectives: [
        ...d.objectives,
        { id: crypto.randomUUID(), title, order: d.objectives.length },
      ],
    }));
    setNewObjectiveTitle('');
    setAddingObjective(false);
  }, [newObjectiveTitle, updateOKR]);

  const deleteObjective = useCallback((objectiveId: string) => {
    if (!window.confirm('이 목표와 하위 KR, 연결된 작업을 모두 삭제하시겠습니까?')) return;
    updateOKR((d) => {
      const krIds = new Set(
        d.keyResults.filter((kr) => kr.objectiveId === objectiveId).map((kr) => kr.id),
      );
      const remainingLinks = d.links.filter((l) => !krIds.has(l.keyResultId));
      const linkedVTIds = new Set(
        remainingLinks.filter((l) => l.type === 'virtual').map((l) => l.virtualTicketId),
      );
      const removedLinkIds = new Set(
        d.links.filter((l) => krIds.has(l.keyResultId)).map((l) => l.id),
      );
      return {
        ...d,
        objectives: d.objectives.filter((o) => o.id !== objectiveId),
        keyResults: d.keyResults.filter((kr) => kr.objectiveId !== objectiveId),
        links: remainingLinks,
        groups: d.groups.filter((g) => !krIds.has(g.keyResultId)),
        virtualTickets: d.virtualTickets.filter(
          (vt) => linkedVTIds.has(vt.id),
        ),
        relations: d.relations.filter(
          (r) => !(r.fromType === 'link' && removedLinkIds.has(r.fromId)) &&
                 !(r.toType === 'link' && removedLinkIds.has(r.toId)),
        ),
      };
    });
  }, [updateOKR]);

  // ── CRUD: Key Results ─────────────────────────────────────────────────────
  const addKeyResult = useCallback((objectiveId: string) => {
    const title = newKRTitle.trim();
    if (!title) return;
    updateOKR((d) => ({
      ...d,
      keyResults: [
        ...d.keyResults,
        {
          id: crypto.randomUUID(),
          objectiveId,
          title,
          order: d.keyResults.filter((kr) => kr.objectiveId === objectiveId).length,
        },
      ],
    }));
    setNewKRTitle('');
    setAddingKRForObjective(null);
  }, [newKRTitle, updateOKR]);

  const deleteKeyResult = useCallback((krId: string) => {
    if (!window.confirm('이 KR과 연결된 작업을 모두 삭제하시겠습니까?')) return;
    updateOKR((d) => {
      const removedLinkIds = new Set(
        d.links.filter((l) => l.keyResultId === krId).map((l) => l.id),
      );
      const remainingLinks = d.links.filter((l) => l.keyResultId !== krId);
      const linkedVTIds = new Set(
        remainingLinks.filter((l) => l.type === 'virtual').map((l) => l.virtualTicketId),
      );
      return {
        ...d,
        keyResults: d.keyResults.filter((kr) => kr.id !== krId),
        links: remainingLinks,
        groups: d.groups.filter((g) => g.keyResultId !== krId),
        virtualTickets: d.virtualTickets.filter(
          (vt) => linkedVTIds.has(vt.id),
        ),
        relations: d.relations.filter(
          (r) => !(r.fromType === 'link' && removedLinkIds.has(r.fromId)) &&
                 !(r.toType === 'link' && removedLinkIds.has(r.toId)),
        ),
      };
    });
  }, [updateOKR]);

  // ── CRUD: Links (for main page link modal) ─────────────────────────────
  const linkJiraIssues = useCallback((keyResultId: string, issueKeys: string[]) => {
    if (issueKeys.length === 0) return;
    updateOKR((d) => {
      const krLinks = d.links.filter((l) => l.keyResultId === keyResultId);
      const krGrps = d.groups.filter((g) => g.keyResultId === keyResultId);
      const occupied: Rect[] = [
        ...krLinks.map((l) => ({ x: l.x ?? 0, y: l.y ?? 0, w: CARD_W, h: CARD_H })),
        ...krGrps.map((g) => ({ x: g.x ?? 0, y: g.y ?? 0, w: g.w ?? 300, h: g.h ?? 200 })),
      ];
      const newLinks = issueKeys.map((issueKey, i) => {
        const pos = assignDefaultPosition(occupied, CARD_W, CARD_H, 800);
        occupied.push({ x: pos.x, y: pos.y, w: CARD_W, h: CARD_H });
        return {
          id: crypto.randomUUID(),
          keyResultId,
          type: 'jira' as const,
          issueKey,
          order: krLinks.length + i,
          x: pos.x,
          y: pos.y,
        };
      });
      return { ...d, links: [...d.links, ...newLinks] };
    });
    setLinkModalKRId(null);
  }, [updateOKR]);

  const createAndLinkVirtual = useCallback((
    keyResultId: string,
    title: string,
    issueType: string,
    assignee: string,
  ) => {
    const vtId = crypto.randomUUID();
    updateOKR((d) => {
      const krLinks = d.links.filter((l) => l.keyResultId === keyResultId);
      const krGrps = d.groups.filter((g) => g.keyResultId === keyResultId);
      const occupied: Rect[] = [
        ...krLinks.map((l) => ({ x: l.x ?? 0, y: l.y ?? 0, w: CARD_W, h: CARD_H })),
        ...krGrps.map((g) => ({ x: g.x ?? 0, y: g.y ?? 0, w: g.w ?? 300, h: g.h ?? 200 })),
      ];
      const pos = assignDefaultPosition(occupied, CARD_W, CARD_H, 800);
      return {
        ...d,
        virtualTickets: [
          ...d.virtualTickets,
          {
            id: vtId,
            title,
            issueType,
            assignee: assignee || undefined,
            createdAt: new Date().toISOString(),
          },
        ],
        links: [
          ...d.links,
          {
            id: crypto.randomUUID(),
            keyResultId,
            type: 'virtual' as const,
            virtualTicketId: vtId,
            order: krLinks.length,
            x: pos.x,
            y: pos.y,
          },
        ],
      };
    });
    setLinkModalKRId(null);
  }, [updateOKR]);

  // ── Inline editing ────────────────────────────────────────────────────────
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

  // ── Collapse toggle ───────────────────────────────────────────────────────
  const toggleCollapse = useCallback((objectiveId: string) => {
    setCollapsedObjectives((prev) => {
      const next = new Set(prev);
      if (next.has(objectiveId)) {
        next.delete(objectiveId);
      } else {
        next.add(objectiveId);
      }
      return next;
    });
  }, []);

  // ── Existing issue keys for a given KR (for de-duplication in modal) ──────
  const getExistingIssueKeys = useCallback((krId: string): Set<string> => {
    return new Set(
      okr.links
        .filter((l) => l.keyResultId === krId && l.type === 'jira' && l.issueKey)
        .map((l) => l.issueKey!),
    );
  }, [okr.links]);

  return {
    okr,
    updateOKR,

    // UI state
    collapsedObjectives,
    editingId,
    editingValue,
    setEditingValue,
    addingObjective,
    setAddingObjective,
    newObjectiveTitle,
    setNewObjectiveTitle,
    addingKRForObjective,
    setAddingKRForObjective,
    newKRTitle,
    setNewKRTitle,
    linkModalKRId,
    setLinkModalKRId,
    canvasKRId,
    setCanvasKRId,
    setEditingId,

    // Actions
    addObjective,
    deleteObjective,
    addKeyResult,
    deleteKeyResult,
    linkJiraIssues,
    createAndLinkVirtual,
    startEditing,
    saveEditing,
    toggleCollapse,
    getExistingIssueKeys,
  };
}
