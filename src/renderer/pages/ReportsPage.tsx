import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Spinner from '../components/common/Spinner';
import ReportDetailView from '../components/report/ReportDetailView';
import ReportPromptSection from '../components/report/ReportPromptSection';
import ReportSaveForm from '../components/report/ReportSaveForm';
import ReportList from '../components/report/ReportList';
import { useReports, useReport } from '../hooks/useReports';
import { useJiraIssues } from '../hooks/useJiraIssues';
import { useReportFilter } from '../hooks/useReportFilter';
import { useReportPrompt } from '../hooks/useReportPrompt';
import { useReportAI } from '../hooks/useReportAI';
import { buildIssueExportData } from '../utils/reports';

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const { reports, isLoading } = useReports();
  const { data: storedData } = useJiraIssues();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { content, isLoading: isLoadingContent } = useReport(selectedFile);
  const [deleting, setDeleting] = useState<string | null>(null);

  // 단일 책임 훅 조합
  const filter = useReportFilter(storedData?.issues);
  const prompt = useReportPrompt(filter.assignee, filter.startDate, filter.endDate);
  const aiReport = useReportAI(
    filter.filteredIssues,
    prompt.promptText,
    filter.assignee,
    filter.startDate,
    filter.endDate,
  );

  const handleDelete = useCallback(async (filename: string) => {
    if (!confirm(`"${filename.replace(/\.md$/, '')}" 리포트를 삭제하시겠습니까?`)) return;
    setDeleting(filename);
    try {
      await window.electronAPI.storage.deleteReport(filename);
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      if (selectedFile === filename) setSelectedFile(null);
    } finally {
      setDeleting(null);
    }
  }, [queryClient, selectedFile]);

  const handleDownloadJson = useCallback(() => {
    const data = buildIssueExportData(filter.filteredIssues);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jira-issues_${filter.assignee}_${filter.startDate}_${filter.endDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filter.filteredIssues, filter.assignee, filter.startDate, filter.endDate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  // 상세 뷰
  if (selectedFile && content !== null) {
    return (
      <ReportDetailView
        filename={selectedFile}
        content={content}
        isLoading={isLoadingContent}
        onBack={() => setSelectedFile(null)}
      />
    );
  }

  // 목록 뷰
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">리포트</h1>
      </div>

      <ReportPromptSection
        assignee={filter.assignee}
        setAssignee={filter.setAssignee}
        startDate={filter.startDate}
        setStartDate={filter.setStartDate}
        endDate={filter.endDate}
        setEndDate={filter.setEndDate}
        assignees={filter.assignees}
        filteredIssues={filter.filteredIssues}
        promptText={prompt.promptText}
        copied={prompt.copied}
        onCopyPrompt={prompt.handleCopyPrompt}
        onDownloadJson={handleDownloadJson}
        onGenerateAI={aiReport.handleGenerateAI}
        aiRunning={aiReport.ai.status === 'running'}
      />

      <ReportSaveForm />

      <div className="px-6 py-2 text-xs text-gray-400 border-b border-gray-100">
        {reports.length}개 리포트
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <ReportList
          reports={reports}
          deleting={deleting}
          onSelect={setSelectedFile}
          onDelete={handleDelete}
        />
      </div>

    </div>
  );
}
