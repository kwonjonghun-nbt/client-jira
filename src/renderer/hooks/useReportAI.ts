import { useCallback } from 'react';
import type { NormalizedIssue, IssueTransitionSummary } from '../types/jira.types';
import { buildIssueExportData } from '../utils/reports';
import { buildTransitionSummary } from '../utils/status-transitions';
import { useAIRunner } from './useAIRunner';
import { useTerminalStore } from '../store/terminalStore';
import { useAITaskStore } from '../store/aiTaskStore';
import { createTaskId, generateTaskTitle } from '../utils/ai-tasks';

export function useReportAI(
  filteredIssues: NormalizedIssue[],
  promptText: string,
  assignee: string,
  startDate: string,
  endDate: string,
) {
  const ai = useAIRunner();
  const aiType = useTerminalStore((s) => s.aiType);
  const addTask = useAITaskStore((s) => s.addTask);

  const handleGenerateAI = useCallback(async () => {
    if (filteredIssues.length === 0) return;

    const issueData = JSON.stringify(buildIssueExportData(filteredIssues), null, 2);

    const transitionResults = await Promise.allSettled(
      filteredIssues.map(async (issue) => {
        const histories = await window.electronAPI.jira.getIssueChangelog(issue.key);
        return buildTransitionSummary(issue.key, histories, issue.status);
      }),
    );
    const transitionData = transitionResults
      .filter((r): r is PromiseFulfilledResult<IssueTransitionSummary> => r.status === 'fulfilled')
      .map((r) => r.value);
    const transitionJson = JSON.stringify(transitionData, null, 2);

    const fullPrompt = `${promptText}\n\n## 이슈 데이터 (JSON)\n\n${issueData}\n\n## 상태 전환 데이터 (JSON)\n\n${transitionJson}`;
    const jobId = await ai.run(fullPrompt, aiType);

    if (jobId) {
      addTask({
        id: createTaskId(),
        jobIds: [jobId],
        type: 'report',
        title: generateTaskTitle('report', { assignee, startDate, endDate }),
        status: 'running',
        result: '',
        error: null,
        createdAt: Date.now(),
      });
    }
  }, [filteredIssues, promptText, ai, aiType, addTask, assignee, startDate, endDate]);

  return { ai, handleGenerateAI };
}
