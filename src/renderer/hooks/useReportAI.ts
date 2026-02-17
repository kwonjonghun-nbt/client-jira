import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { NormalizedIssue } from '../types/jira.types';
import { buildIssueExportData } from '../utils/reports';
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

  const handleGenerateAI = useCallback(() => {
    if (filteredIssues.length === 0) return;
    const issueData = JSON.stringify(buildIssueExportData(filteredIssues), null, 2);
    const fullPrompt = `${promptText}\n\n## 이슈 데이터 (JSON)\n\n${issueData}`;
    ai.run(fullPrompt, aiType);
    setShowAIModal(true);
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
