import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { NormalizedIssue } from '../types/jira.types';
import {
  getDefaultPeriod,
  extractAssignees,
  filterReportIssues,
  buildReportPrompt,
  buildIssueExportData,
} from '../utils/reports';
import { useAIRunner } from './useAIRunner';
import { useTerminalStore } from '../store/terminalStore';

export function useReportActions(issues: NormalizedIssue[] | undefined) {
  const queryClient = useQueryClient();
  const ai = useAIRunner();
  const aiType = useTerminalStore((s) => s.aiType);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveContent, setSaveContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  const defaultPeriod = useMemo(() => getDefaultPeriod(), []);
  const [assignee, setAssignee] = useState('전체');
  const [startDate, setStartDate] = useState(defaultPeriod.start);
  const [endDate, setEndDate] = useState(defaultPeriod.end);

  const assignees = useMemo(
    () => extractAssignees(issues ?? []),
    [issues],
  );

  const filteredIssues = useMemo(
    () => filterReportIssues(issues ?? [], assignee, startDate, endDate),
    [issues, assignee, startDate, endDate],
  );

  const promptText = useMemo(
    () => buildReportPrompt(assignee, startDate, endDate),
    [assignee, startDate, endDate],
  );

  const handleCopyPrompt = useCallback(async () => {
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [promptText]);

  const handleSaveReport = useCallback(async () => {
    if (!saveTitle.trim() || !saveContent.trim()) return;
    setSaving(true);
    try {
      await window.electronAPI.storage.saveReport(saveTitle.trim(), saveContent);
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      setSaveTitle('');
      setSaveContent('');
      setShowSaveForm(false);
    } finally {
      setSaving(false);
    }
  }, [saveTitle, saveContent, queryClient]);

  const handleDownloadJson = useCallback(() => {
    const data = buildIssueExportData(filteredIssues);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jira-issues_${assignee}_${startDate}_${endDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredIssues, assignee, startDate, endDate]);

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
    showPrompt,
    setShowPrompt,
    copied,
    showSaveForm,
    setShowSaveForm,
    saveTitle,
    setSaveTitle,
    saveContent,
    setSaveContent,
    saving,
    assignee,
    setAssignee,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    assignees,
    filteredIssues,
    promptText,
    handleCopyPrompt,
    handleSaveReport,
    handleDownloadJson,
    // AI generation
    ai,
    showAIModal,
    setShowAIModal,
    handleGenerateAI,
    handleSaveAIReport,
  };
}
