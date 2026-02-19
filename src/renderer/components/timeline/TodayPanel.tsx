import { useMemo } from 'react';
import TodayFocus from '../dashboard/TodayFocus';
import type { NormalizedIssue } from '../../types/jira.types';
import type { useDailyShare } from '../../hooks/useDailyShare';
import { computeTodayFocus } from '../../utils/dashboard';

interface TodayPanelProps {
  /** 기간 필터가 적용된 이슈 목록 (todayFocus 계산용) */
  dateFilteredIssues: NormalizedIssue[];
  /** 전체 이슈 목록 (이슈공유용) */
  allIssues: NormalizedIssue[] | undefined;
  dailyShare: ReturnType<typeof useDailyShare>;
  onIssueClick: (issue: NormalizedIssue) => void;
  onClose: () => void;
}

export default function TodayPanel({
  dateFilteredIssues,
  allIssues,
  dailyShare,
  onIssueClick,
  onClose,
}: TodayPanelProps) {
  const todayFocus = useMemo(
    () => computeTodayFocus(dateFilteredIssues),
    [dateFilteredIssues],
  );

  return (
    <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-sm font-semibold text-gray-800">오늘의 업무</h2>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded cursor-pointer border-none bg-transparent transition-colors"
          title="패널 닫기"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* 오늘의 이슈공유 */}
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">이슈공유</h3>
          <div className="space-y-2">
            <select
              value={dailyShare.assignee}
              onChange={(e) => dailyShare.setAssignee(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
            >
              <option value="전체">전체</option>
              {dailyShare.assignees.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={dailyShare.handleGenerateFromData}
                disabled={!dailyShare.assignee || dailyShare.totalCount === 0}
                className="flex-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none"
              >
                데이터 기반
              </button>
              <button
                type="button"
                onClick={dailyShare.handleGenerate}
                disabled={!dailyShare.assignee || dailyShare.totalCount === 0 || dailyShare.ai.status === 'running'}
                className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none"
              >
                AI 생성
              </button>
            </div>
            {dailyShare.assignee && dailyShare.categories && (
              <p className="text-[11px] text-gray-500">
                진행 {dailyShare.categories.inProgress.length} · 마감 {dailyShare.categories.dueToday.length} · 지연 {dailyShare.categories.overdue.length} · 리스크 {dailyShare.categories.atRisk.length}
              </p>
            )}
          </div>
        </div>

        {/* 오늘의 업무 목록 */}
        <TodayFocus issues={todayFocus} onIssueClick={onIssueClick} />
      </div>
    </div>
  );
}
