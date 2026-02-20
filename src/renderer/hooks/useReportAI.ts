import { useCallback } from 'react';
import type { NormalizedIssue } from '../types/jira.types';
import { buildIssueExportData } from '../utils/reports';
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
  const claudeModel = useTerminalStore((s) => s.claudeModel);
  const geminiModel = useTerminalStore((s) => s.geminiModel);
  const addTask = useAITaskStore((s) => s.addTask);

  const handleGenerateAI = useCallback(async () => {
    if (filteredIssues.length === 0) return;

    const issueData = JSON.stringify(buildIssueExportData(filteredIssues), null, 2);
    const fullPrompt = `${promptText}\n\n## 이슈 데이터 (JSON)\n\n${issueData}`;
    const model = aiType === 'claude' ? claudeModel : geminiModel;
    const jobId = await ai.run(fullPrompt, aiType, model);

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
  }, [filteredIssues, promptText, ai, aiType, claudeModel, geminiModel, addTask, assignee, startDate, endDate]);

  return { ai, handleGenerateAI };
}
