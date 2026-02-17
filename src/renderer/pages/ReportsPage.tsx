import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Spinner from '../components/common/Spinner';
import AIReportModal from '../components/report/AIReportModal';
import SectionPresenter from '../components/report/SectionPresenter';
import { useReports, useReport } from '../hooks/useReports';
import { useJiraIssues } from '../hooks/useJiraIssues';
import { useReportActions } from '../hooks/useReportActions';
import { formatReportDate, renderMarkdown } from '../utils/reports';

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const { reports, isLoading } = useReports();
  const { data: storedData } = useJiraIssues();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { content, isLoading: isLoadingContent } = useReport(selectedFile);
  const [focusMode, setFocusMode] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const {
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
    ai,
    showAIModal,
    setShowAIModal,
    handleGenerateAI,
    handleSaveAIReport,
  } = useReportActions(storedData?.issues);

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
      <div className="h-full flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            ← 목록
          </button>
          <h1 className="text-lg font-bold text-gray-900 flex-1">
            {selectedFile.replace(/\.md$/, '')}
          </h1>
          {!isLoadingContent && content && (
            <button
              type="button"
              onClick={() => setFocusMode(true)}
              className="px-3 py-1 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors cursor-pointer"
            >
              집중해서 보기
            </button>
          )}
        </div>
        <div className="flex-1 overflow-auto px-6 py-4">
          {isLoadingContent ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <div
              className="max-w-4xl"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          )}
        </div>
        {focusMode && content && (
          <SectionPresenter
            markdown={content}
            onClose={() => setFocusMode(false)}
          />
        )}
      </div>
    );
  }

  // 목록 뷰
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">리포트</h1>
      </div>

      <div className="border-b border-gray-200 px-6 py-3">
        <button
          type="button"
          onClick={() => setShowPrompt((v) => !v)}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
        >
          <span className={`transition-transform ${showPrompt ? 'rotate-90' : ''}`}>▶</span>
          리포트 생성 프롬프트
        </button>
        {showPrompt && (
          <div className="mt-3">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                담당자
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                >
                  <option value="전체">전체</option>
                  {assignees.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                시작일
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                종료일
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                />
              </label>
            </div>
            <div className="flex items-center gap-3 mb-3 p-2 bg-gray-50 rounded-lg">
              <span className="text-xs text-gray-600">
                해당 기간 이슈: <strong>{filteredIssues.length}건</strong>
              </span>
              <button
                type="button"
                onClick={handleDownloadJson}
                disabled={filteredIssues.length === 0}
                className="px-3 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                이슈 데이터 다운로드 (.json)
              </button>
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={filteredIssues.length === 0 || ai.status === 'running'}
                className="px-3 py-1 text-xs bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                AI 리포트 생성
              </button>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">아래 프롬프트를 복사하여 AI에게 붙여넣기하세요</span>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
              >
                {copied ? '✓ 복사됨' : '복사'}
              </button>
            </div>
            <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto max-h-64 whitespace-pre-wrap leading-relaxed">
              {promptText}
            </pre>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200 px-6 py-3">
        <button
          type="button"
          onClick={() => setShowSaveForm((v) => !v)}
          className="flex items-center gap-2 text-sm text-green-600 hover:text-green-800 transition-colors cursor-pointer"
        >
          <span className={`transition-transform ${showSaveForm ? 'rotate-90' : ''}`}>▶</span>
          리포트 저장
        </button>
        {showSaveForm && (
          <div className="mt-3 flex flex-col gap-3">
            <input
              type="text"
              placeholder="리포트 제목 (파일명으로 사용됩니다)"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
            />
            <textarea
              placeholder="AI가 생성한 리포트 내용을 붙여넣기하세요 (마크다운)"
              value={saveContent}
              onChange={(e) => setSaveContent(e.target.value)}
              rows={12}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-mono resize-y focus:outline-none focus:ring-2 focus:ring-green-300"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveReport}
                disabled={!saveTitle.trim() || !saveContent.trim() || saving}
                className="px-4 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <span className="text-xs text-gray-400">
                {saveTitle.trim() && `${saveTitle.trim()}.md 로 저장됩니다`}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-2 text-xs text-gray-400 border-b border-gray-100">
        {reports.length}개 리포트
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {reports.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-1">리포트가 없습니다</p>
            <p className="text-sm">reports 폴더에 .md 파일을 추가하면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {reports.map((report) => (
              <div
                key={report.filename}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => setSelectedFile(report.filename)}
                  className="flex-1 flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-left"
                >
                  <div>
                    <div className="font-medium text-sm text-gray-800">{report.title}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      수정일: {formatReportDate(report.modifiedAt)}
                    </div>
                  </div>
                  <span className="text-gray-300 text-sm">→</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(report.filename)}
                  disabled={deleting === report.filename}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  title="삭제"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAIModal && (
        <AIReportModal
          ai={ai}
          saving={saving}
          onSave={handleSaveAIReport}
          onClose={() => { setShowAIModal(false); ai.reset(); }}
        />
      )}
    </div>
  );
}
