import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from 'es-toolkit';
import type { OKRData } from '../types/jira.types';
import { useOKRCollapse } from './okr/useOKRCollapse';
import { useOKRInlineEdit } from './okr/useOKRInlineEdit';
import { useOKRCrud } from './okr/useOKRCrud';

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

  // ── Debounced save — stable ref so re-renders don't recreate the debounce ──
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const debouncedSaveRef = useRef(
    debounce((okrData: OKRData) => saveRef.current(okrData), 500),
  );

  // ── OKR update helper ─────────────────────────────────────────────────────
  const updateOKR = useCallback(
    (updater: (draft: OKRData) => OKRData) => {
      const current = data ?? emptyOKR;
      const updated = updater({ ...current });
      updated.updatedAt = new Date().toISOString();
      debouncedSaveRef.current(updated);
    },
    [data],
  );

  // ── Modal state (managed here for cross-concern coordination) ─────────────
  const [linkModalKRId, setLinkModalKRId] = useState<string | null>(null);
  const [canvasKRId, setCanvasKRId] = useState<string | null>(null);

  // ── Composed hooks ────────────────────────────────────────────────────────
  const collapse = useOKRCollapse(okr.objectives);
  const inlineEdit = useOKRInlineEdit(updateOKR);
  const crud = useOKRCrud(okr, updateOKR);

  // ── Wrap crud link actions to auto-close modal ────────────────────────────
  const linkJiraIssues = useCallback(
    (keyResultId: string, issueKeys: string[]) => {
      crud.linkJiraIssues(keyResultId, issueKeys, () => setLinkModalKRId(null));
    },
    [crud, setLinkModalKRId],
  );

  const createAndLinkVirtual = useCallback(
    (keyResultId: string, title: string, issueType: string, assignee: string) => {
      crud.createAndLinkVirtual(keyResultId, title, issueType, assignee, () =>
        setLinkModalKRId(null),
      );
    },
    [crud, setLinkModalKRId],
  );

  return {
    okr,
    updateOKR,

    // UI state — Collapse
    ...collapse,

    // UI state — Inline edit
    ...inlineEdit,

    // UI state — CRUD forms
    addingObjective: crud.addingObjective,
    setAddingObjective: crud.setAddingObjective,
    newObjectiveTitle: crud.newObjectiveTitle,
    setNewObjectiveTitle: crud.setNewObjectiveTitle,
    addingKRForObjective: crud.addingKRForObjective,
    setAddingKRForObjective: crud.setAddingKRForObjective,
    newKRTitle: crud.newKRTitle,
    setNewKRTitle: crud.setNewKRTitle,

    // Modal state
    linkModalKRId,
    setLinkModalKRId,
    canvasKRId,
    setCanvasKRId,

    // Actions — Objectives
    addObjective: crud.addObjective,
    deleteObjective: crud.deleteObjective,

    // Actions — Key Results
    addKeyResult: crud.addKeyResult,
    deleteKeyResult: crud.deleteKeyResult,

    // Actions — Links (wrapped to close modal)
    linkJiraIssues,
    createAndLinkVirtual,

    // Actions — Inline edit
    startEditing: inlineEdit.startEditing,
    saveEditing: inlineEdit.saveEditing,

    // Actions — Collapse
    toggleCollapse: collapse.toggleCollapse,

    // Helpers
    getExistingIssueKeys: crud.getExistingIssueKeys,
  };
}
