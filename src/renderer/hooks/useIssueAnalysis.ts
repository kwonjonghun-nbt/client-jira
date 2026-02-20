import { useCallback } from 'react';
import type { NormalizedIssue } from '../types/jira.types';
import { useAIExecutor } from './useAIExecutor';
import { useAITaskStore } from '../store/aiTaskStore';
import { buildPrompt } from '../utils/issue-prompts';
import { createTaskId, generateTaskTitle } from '../utils/ai-tasks';

export function useIssueAnalysis() {
  const { execute } = useAIExecutor();
  const addTask = useAITaskStore((s) => s.addTask);
  const tasks = useAITaskStore((s) => s.tasks);

  const analyze = useCallback(
    async (issue: NormalizedIssue) => {
      const prompt = buildPrompt(issue);
      try {
        const jobId = await execute(prompt);
        addTask({
          id: createTaskId(),
          jobIds: [jobId],
          type: 'issue-analysis',
          title: generateTaskTitle('issue-analysis', { issueKey: issue.key }),
          status: 'running',
          result: '',
          error: null,
          createdAt: Date.now(),
        });
      } catch {
        // AI runner error handled by task listener
      }
    },
    [execute, addTask],
  );

  const isAnalyzing = useCallback(
    (issueKey: string) =>
      tasks.some((t) => t.type === 'issue-analysis' && t.status === 'running' && t.title.includes(issueKey)),
    [tasks],
  );

  return { analyze, isAnalyzing };
}
