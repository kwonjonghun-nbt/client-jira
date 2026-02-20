import { useState, useCallback } from 'react';
import type { NormalizedIssue } from '../types/jira.types';
import { buildIssueExportData } from '../utils/reports';
import { useAIExecutor } from './useAIExecutor';
import { useAITaskStore } from '../store/aiTaskStore';
import { createTaskId, generateTaskTitle } from '../utils/ai-tasks';

export function useReportAI(
  filteredIssues: NormalizedIssue[],
  promptText: string,
  assignee: string,
  startDate: string,
  endDate: string,
) {
  const { execute } = useAIExecutor();
  const addTask = useAITaskStore((s) => s.addTask);
  const tasks = useAITaskStore((s) => s.tasks);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const handleGenerateAI = useCallback(async () => {
    if (filteredIssues.length === 0) return;

    const issueData = JSON.stringify(buildIssueExportData(filteredIssues), null, 2);
    const fullPrompt = `${promptText}\n\n## 이슈 데이터 (JSON)\n\n${issueData}`;
    const jobId = await execute(fullPrompt);
    const taskId = createTaskId();

    addTask({
      id: taskId,
      jobIds: [jobId],
      type: 'report',
      title: generateTaskTitle('report', { assignee, startDate, endDate }),
      status: 'running',
      result: '',
      error: null,
      createdAt: Date.now(),
    });

    setActiveTaskId(taskId);
  }, [filteredIssues, promptText, execute, addTask, assignee, startDate, endDate]);

  const isRunning = activeTaskId
    ? tasks.some((t) => t.id === activeTaskId && t.status === 'running')
    : false;

  return { handleGenerateAI, isRunning };
}
