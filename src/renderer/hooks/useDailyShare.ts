import { useState, useMemo, useCallback } from 'react';
import { uniq } from 'es-toolkit';
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
import { useAITaskStore } from '../store/aiTaskStore';
import { createTaskId, generateTaskTitle } from '../utils/ai-tasks';

export function useDailyShare(issues: NormalizedIssue[] | undefined) {
  const singleAI = useAIRunner();
  const multiAI = useMultiAIRunner();
  const aiType = useTerminalStore((s) => s.aiType);
  const addTask = useAITaskStore((s) => s.addTask);
  const selectTask = useAITaskStore((s) => s.selectTask);
  const [assignee, setAssignee] = useState<string>('전체');
  const [isMultiMode, setIsMultiMode] = useState(false);

  const assignees = useMemo(() => {
    if (!issues) return [];
    return uniq(issues.map((i) => i.assignee).filter((a): a is string => a != null)).sort();
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

  // Unified AI state for backward compatibility with dashboard UI
  const ai = useMemo(() => {
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
  }, [isMultiMode, singleAI, multiAI]);

  const handleGenerate = useCallback(async () => {
    if (!issues) return;

    if (assignee === '전체') {
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
      const jobMapping = await multiAI.runAll(tasks, aiType);

      if (jobMapping && jobMapping.length > 0) {
        const subJobs: Record<string, { assignee: string; status: 'running'; result: string }> = {};
        for (const j of jobMapping) {
          subJobs[j.jobId] = { assignee: j.assignee, status: 'running', result: '' };
        }
        addTask({
          id: createTaskId(),
          jobIds: jobMapping.map(j => j.jobId),
          type: 'daily-share-multi',
          title: generateTaskTitle('daily-share-multi', {}),
          status: 'running',
          result: '',
          error: null,
          createdAt: Date.now(),
          subJobs,
        });
      }
    } else {
      if (!categories || totalCount === 0) return;
      setIsMultiMode(false);
      const prompt = buildDailySharePrompt(assignee, categories);
      const jobId = await singleAI.run(prompt, aiType);

      if (jobId) {
        addTask({
          id: createTaskId(),
          jobIds: [jobId],
          type: 'daily-share',
          title: generateTaskTitle('daily-share', { assignee }),
          status: 'running',
          result: '',
          error: null,
          createdAt: Date.now(),
        });
      }
    }
  }, [issues, assignee, assignees, categories, totalCount, singleAI, multiAI, aiType, addTask]);

  const handleGenerateFromData = useCallback(() => {
    if (!issues) return;

    let md: string | null = null;
    if (assignee === '전체') {
      md = buildMultiAssigneeDailyShareMarkdown(issues, assignees);
    } else {
      if (!categories || totalCount === 0) return;
      md = buildDailyShareMarkdown(assignee, categories);
    }
    if (!md) return;

    // Register as immediate 'done' task so it appears in floating panel
    const taskId = createTaskId();
    addTask({
      id: taskId,
      jobIds: [],
      type: assignee === '전체' ? 'daily-share-multi' : 'daily-share',
      title: generateTaskTitle(assignee === '전체' ? 'daily-share-multi' : 'daily-share', { assignee: assignee !== '전체' ? assignee : undefined }),
      status: 'done',
      result: md,
      error: null,
      createdAt: Date.now(),
    });
    // Auto-open the result
    selectTask(taskId);
  }, [issues, assignee, assignees, categories, totalCount, addTask, selectTask]);

  return {
    assignee,
    setAssignee,
    assignees,
    categories,
    totalCount,
    ai,
    isMultiMode,
    handleGenerate,
    handleGenerateFromData,
  };
}
