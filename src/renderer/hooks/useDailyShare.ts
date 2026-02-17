import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { NormalizedIssue } from '../types/jira.types';
import {
  categorizeDailyIssues,
  buildDailySharePrompt,
  buildDailyShareMarkdown,
  buildMultiAssigneeDailyShareMarkdown,
} from '../utils/daily-share';
import { useAIRunner } from './useAIRunner';
import { useMultiAIRunner } from './useMultiAIRunner';
import { useTerminalStore } from '../store/terminalStore';

export function useDailyShare(issues: NormalizedIssue[] | undefined) {
  const queryClient = useQueryClient();
  const singleAI = useAIRunner();
  const multiAI = useMultiAIRunner();
  const aiType = useTerminalStore((s) => s.aiType);
  const [assignee, setAssignee] = useState<string>('전체');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [dataResult, setDataResult] = useState<string | null>(null);

  const assignees = useMemo(() => {
    if (!issues) return [];
    return [...new Set(issues.map((i) => i.assignee).filter(Boolean) as string[])].sort();
  }, [issues]);

  const categories = useMemo(() => {
    if (!issues || !assignee) return null;
    return categorizeDailyIssues(issues, assignee);
  }, [issues, assignee]);

  const totalCount = useMemo(() => {
    if (!categories) return 0;
    const keys = new Set<string>();
    [categories.inProgress, categories.dueToday, categories.overdue, categories.atRisk]
      .flat()
      .forEach((i) => keys.add(i.key));
    return keys.size;
  }, [categories]);

  const resetDataResult = useCallback(() => setDataResult(null), []);

  // Unified AI state: expose same shape regardless of mode
  const ai = useMemo(() => {
    if (dataResult !== null) {
      return {
        status: 'done' as const,
        result: dataResult,
        error: null as string | null,
        jobId: null as string | null,
        abort: async () => {},
        reset: resetDataResult,
        run: async () => {},
        progress: null as { total: number; completed: number } | null,
      };
    }
    if (isMultiMode) {
      return {
        status: multiAI.status,
        result: multiAI.result,
        error: multiAI.error,
        jobId: null as string | null,
        abort: multiAI.abort,
        reset: multiAI.reset,
        run: async () => {},
        progress: multiAI.progress,
      };
    }
    return {
      status: singleAI.status,
      result: singleAI.result,
      error: singleAI.error,
      jobId: singleAI.jobId,
      abort: singleAI.abort,
      reset: singleAI.reset,
      run: singleAI.run,
      progress: null as { total: number; completed: number } | null,
    };
  }, [dataResult, resetDataResult, isMultiMode, singleAI, multiAI]);

  const handleGenerate = useCallback(() => {
    if (!issues) return;

    if (assignee === '전체') {
      // Multi mode: one job per assignee
      const tasks = assignees
        .map((name) => {
          const cats = categorizeDailyIssues(issues, name);
          const hasIssues = cats.inProgress.length + cats.dueToday.length + cats.overdue.length + cats.atRisk.length > 0;
          if (!hasIssues) return null;
          return { assignee: name, prompt: buildDailySharePrompt(name, cats) };
        })
        .filter(Boolean) as { assignee: string; prompt: string }[];

      if (tasks.length === 0) return;
      setIsMultiMode(true);
      multiAI.runAll(tasks, aiType);
      setShowModal(true);
    } else {
      // Single mode
      if (!categories || totalCount === 0) return;
      setIsMultiMode(false);
      const prompt = buildDailySharePrompt(assignee, categories);
      singleAI.run(prompt, aiType);
      setShowModal(true);
    }
  }, [issues, assignee, assignees, categories, totalCount, singleAI, multiAI, aiType]);

  const handleGenerateFromData = useCallback(() => {
    if (!issues) return;

    if (assignee === '전체') {
      const md = buildMultiAssigneeDailyShareMarkdown(issues, assignees);
      if (!md) return;
      setDataResult(md);
    } else {
      if (!categories || totalCount === 0) return;
      setDataResult(buildDailyShareMarkdown(assignee, categories));
    }
    setShowModal(true);
  }, [issues, assignee, assignees, categories, totalCount]);

  const handleSave = useCallback(async () => {
    const result = dataResult ?? (isMultiMode ? multiAI.result : singleAI.result);
    if (!result.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const title = `일일공유_${assignee}_${today}`;
    setSaving(true);
    try {
      await window.electronAPI.storage.saveReport(title, result);
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      setShowModal(false);
      setDataResult(null);
      if (isMultiMode) multiAI.reset(); else singleAI.reset();
    } finally {
      setSaving(false);
    }
  }, [dataResult, isMultiMode, singleAI, multiAI, assignee, queryClient]);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setDataResult(null);
    if (isMultiMode) multiAI.reset(); else singleAI.reset();
  }, [isMultiMode, singleAI, multiAI]);

  return {
    assignee,
    setAssignee,
    assignees,
    categories,
    totalCount,
    ai,
    showModal,
    saving,
    isMultiMode,
    handleGenerate,
    handleGenerateFromData,
    handleSave,
    handleClose,
  };
}
