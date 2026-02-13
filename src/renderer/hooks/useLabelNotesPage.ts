import { useMemo, useState } from 'react';
import type { NormalizedIssue } from '../types/jira.types';
import { useLabelNotes } from './useLabelNotes';

/** Extract unique labels from Jira issues. Pure function. */
export function extractJiraLabels(issues: NormalizedIssue[] | undefined): Set<string> {
  if (!issues) return new Set<string>();
  const labels = new Set<string>();
  for (const issue of issues) {
    for (const label of issue.labels) {
      labels.add(label);
    }
  }
  return labels;
}

export function useLabelNotesPage(issues: NormalizedIssue[] | undefined) {
  const { notes, isLoading, saveNote, deleteNote } = useLabelNotes();
  const [newLabel, setNewLabel] = useState('');

  const jiraLabels = useMemo(() => extractJiraLabels(issues), [issues]);

  const handleAdd = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    if (notes.some((n) => n.label === trimmed)) return;
    saveNote(trimmed, '');
    setNewLabel('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return {
    notes,
    isLoading,
    saveNote,
    deleteNote,
    newLabel,
    setNewLabel,
    jiraLabels,
    handleAdd,
    handleKeyDown,
  };
}
