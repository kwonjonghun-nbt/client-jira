import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { NormalizedIssue, IssueTransitionSummary } from '../types/jira.types';
import { buildIssueExportData } from '../utils/reports';
import { buildTransitionSummary } from '../utils/status-transitions';
import { useAIRunner } from './useAIRunner';
import { useTerminalStore } from '../store/terminalStore';

export function useReportAI(
  filteredIssues: NormalizedIssue[],
  promptText: string,
  assignee: string,
  startDate: string,
  endDate: string,
) {
  const queryClient = useQueryClient();
  const ai = useAIRunner();
  const aiType = useTerminalStore((s) => s.aiType);
  const [showAIModal, setShowAIModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGenerateAI = useCallback(async () => {
    if (filteredIssues.length === 0) return;
    setShowAIModal(true);

    // 이슈 데이터
    const issueData = JSON.stringify(buildIssueExportData(filteredIssues), null, 2);

    // 상태 전환 데이터 병렬 수집
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

    // 합쳐서 AI에 전달
    const fullPrompt = `${promptText}\n\n## 이슈 데이터 (JSON)\n\n${issueData}\n\n## 상태 전환 데이터 (JSON)\n\n${transitionJson}`;
    ai.run(fullPrompt, aiType);
  }, [filteredIssues, promptText, ai, aiType]);

  const handleSaveAIReport = useCallback(async () => {
    if (!ai.result.trim()) return;
    const title = `${assignee}_${startDate}_${endDate}`;
    setSaving(true);
    try {
      await window.electronAPI.storage.saveReport(title, ai.result);
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      setShowAIModal(false);
      ai.reset();
    } finally {
      setSaving(false);
    }
  }, [ai, assignee, startDate, endDate, queryClient]);

  return {
    ai,
    showAIModal,
    setShowAIModal,
    saving,
    handleGenerateAI,
    handleSaveAIReport,
  };
}
