import { useState, useMemo, useCallback } from 'react';
import { uniq } from 'es-toolkit';
import type { NormalizedIssue } from '../types/jira.types';
import {
  categorizeDailyIssues,
  buildDailySharePrompt,
  buildDailyShareMarkdown,
  buildMultiAssigneeDailyShareMarkdown,
  buildDailyShareSlides,
} from '../utils/daily-share';
import { useAIExecutor } from './useAIExecutor';
import { useAITaskStore } from '../store/aiTaskStore';
import { createTaskId, generateTaskTitle } from '../utils/ai-tasks';

export function useDailyShare(issues: NormalizedIssue[] | undefined) {
  const { execute, executeMulti } = useAIExecutor();
  const addTask = useAITaskStore((s) => s.addTask);
  const selectTask = useAITaskStore((s) => s.selectTask);
  const tasks = useAITaskStore((s) => s.tasks);
  const [assignee, setAssignee] = useState<string>('전체');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

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

  const handleGenerate = useCallback(async () => {
    if (!issues) return;

    if (assignee === '전체') {
      const promptTasks = assignees
        .map((name) => {
          const cats = categorizeDailyIssues(issues, name);
          const hasIssues = cats.inProgress.length + cats.dueToday.length + cats.overdue.length + cats.atRisk.length > 0;
          if (!hasIssues) return null;
          return { key: name, prompt: buildDailySharePrompt(name, cats) };
        })
        .filter(Boolean) as { key: string; prompt: string }[];

      if (promptTasks.length === 0) return;
      const jobMapping = await executeMulti(promptTasks);

      if (jobMapping && jobMapping.length > 0) {
        const subJobs: Record<string, { assignee: string; status: 'running'; result: string }> = {};
        for (const j of jobMapping) {
          subJobs[j.jobId] = { assignee: j.key, status: 'running', result: '' };
        }
        const taskId = createTaskId();
        addTask({
          id: taskId,
          jobIds: jobMapping.map((j) => j.jobId),
          type: 'daily-share-multi',
          title: generateTaskTitle('daily-share-multi', {}),
          status: 'running',
          result: '',
          error: null,
          createdAt: Date.now(),
          subJobs,
        });
        setActiveTaskId(taskId);
      }
    } else {
      if (!categories || totalCount === 0) return;
      const prompt = buildDailySharePrompt(assignee, categories);
      const jobId = await execute(prompt);
      const taskId = createTaskId();

      addTask({
        id: taskId,
        jobIds: [jobId],
        type: 'daily-share',
        title: generateTaskTitle('daily-share', { assignee }),
        status: 'running',
        result: '',
        error: null,
        createdAt: Date.now(),
      });
      setActiveTaskId(taskId);
    }
  }, [issues, assignee, assignees, categories, totalCount, execute, executeMulti, addTask]);

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

    // Build visual slides
    const cats = assignee === '전체'
      ? categorizeDailyIssues(issues, '전체')
      : categories;
    const slides = cats ? buildDailyShareSlides(assignee, cats) : undefined;

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
      slides,
    });
    // Auto-open the result
    selectTask(taskId);
  }, [issues, assignee, assignees, categories, totalCount, addTask, selectTask]);

  const isRunning = activeTaskId
    ? tasks.some((t) => t.id === activeTaskId && t.status === 'running')
    : false;

  return {
    assignee,
    setAssignee,
    assignees,
    categories,
    totalCount,
    isRunning,
    handleGenerate,
    handleGenerateFromData,
  };
}
