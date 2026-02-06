import { useMemo, useState } from 'react';
import TimelineChart from '../components/timeline/TimelineChart';
import type { ViewMode } from '../components/timeline/TimelineHeader';
import IssueFilters from '../components/issue/IssueFilters';
import SyncButton from '../components/sync/SyncButton';
import SyncStatusDisplay from '../components/sync/SyncStatus';
import Spinner from '../components/common/Spinner';
import { useJiraIssues } from '../hooks/useJiraIssues';
import { useFilters } from '../hooks/useFilters';
import { useUIStore } from '../store/uiStore';

const ISSUE_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string; activeColor: string }> = {
  epic: { icon: '⚡', label: 'Epic', color: 'bg-gray-100 text-gray-500', activeColor: 'bg-purple-100 text-purple-700' },
  story: { icon: '📗', label: 'Story', color: 'bg-gray-100 text-gray-500', activeColor: 'bg-blue-100 text-blue-700' },
  task: { icon: '✅', label: 'Task', color: 'bg-gray-100 text-gray-500', activeColor: 'bg-emerald-100 text-emerald-700' },
  'sub-task': { icon: '🔹', label: 'Sub-task', color: 'bg-gray-100 text-gray-500', activeColor: 'bg-cyan-100 text-cyan-700' },
  subtask: { icon: '🔹', label: 'Sub-task', color: 'bg-gray-100 text-gray-500', activeColor: 'bg-cyan-100 text-cyan-700' },
  bug: { icon: '🐛', label: 'Bug', color: 'bg-gray-100 text-gray-500', activeColor: 'bg-red-100 text-red-700' },
};

const VIEW_MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'month', label: '월' },
  { value: 'week', label: '주' },
  { value: 'day', label: '일' },
];

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

export default function TimelinePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [zoom, setZoom] = useState(1);
  const [scrollToTodayTrigger, setScrollToTodayTrigger] = useState(0);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const { data, isLoading, error } = useJiraIssues();
  const issues = data?.issues ?? [];
  const { filters, setFilter, toggleStatus, filteredIssues, filterOptions } = useFilters(issues);
  const setPage = useUIStore((s) => s.setPage);

  // 실제 데이터에 존재하는 이슈타입 목록 (중복 제거, 소문자 키)
  const issueTypes = useMemo(() => {
    const types = new Map<string, string>();
    for (const issue of filteredIssues) {
      const key = issue.issueType.toLowerCase();
      if (!types.has(key)) types.set(key, issue.issueType);
    }
    return Array.from(types.entries());
  }, [filteredIssues]);

  const toggleType = (typeKey: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeKey)) next.delete(typeKey);
      else next.add(typeKey);
      return next;
    });
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-700 mb-2">타임라인</h2>
          <p className="text-gray-400 mb-4">아직 데이터가 없습니다</p>
          <p className="text-sm text-gray-400 mb-6">
            설정에서 Jira 연결을 구성한 후 싱크해주세요
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setPage('settings')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              설정으로 이동
            </button>
            <SyncButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">타임라인</h1>
            <SyncStatusDisplay
              syncedAt={data.syncedAt}
              totalCount={data.totalCount}
              projects={data.source.projects}
            />
          </div>
          <SyncButton />
        </div>

        <div className="flex items-center justify-between gap-4">
          <IssueFilters
            filters={filters}
            filterOptions={filterOptions}
            onChangeFilter={setFilter}
            onToggleStatus={toggleStatus}
          />
          <div className="flex items-center gap-3 shrink-0">
            {/* 이슈타입 토글 */}
            {issueTypes.length > 0 && (
              <div className="flex items-center gap-1">
                {issueTypes.map(([key, originalName]) => {
                  const config = ISSUE_TYPE_CONFIG[key];
                  const isVisible = !hiddenTypes.has(key);
                  const icon = config?.icon ?? '📄';
                  const label = config?.label ?? originalName;
                  const colorClass = isVisible
                    ? (config?.activeColor ?? 'bg-gray-200 text-gray-700')
                    : 'bg-gray-100 text-gray-400 line-through';
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleType(key)}
                      className={`px-2 py-0.5 text-xs rounded-full cursor-pointer border-none transition-colors ${colorClass}`}
                      title={isVisible ? `${label} 숨기기` : `${label} 보이기`}
                    >
                      {icon} {label}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex items-center gap-1">
              {VIEW_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setViewMode(opt.value)}
                  className={`px-3 py-1 text-xs rounded cursor-pointer border-none transition-colors ${
                    viewMode === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setScrollToTodayTrigger((t) => t + 1)}
              className="px-3 py-1 text-xs rounded cursor-pointer border-none bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              오늘
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
                disabled={zoom <= ZOOM_MIN}
                className="w-7 h-7 flex items-center justify-center text-sm rounded cursor-pointer border-none bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                -
              </button>
              <span className="text-xs text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
                disabled={zoom >= ZOOM_MAX}
                className="w-7 h-7 flex items-center justify-center text-sm rounded cursor-pointer border-none bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 py-2 bg-red-50 text-red-600 text-sm">
          데이터 로드 오류: {error.message}
        </div>
      )}

      {/* Issue Count */}
      <div className="px-6 py-2 text-xs text-gray-400 border-b border-gray-100">
        {filteredIssues.length}건 표시
        {filteredIssues.length !== issues.length && ` (전체 ${issues.length}건)`}
      </div>

      {/* Timeline Chart */}
      <div className="flex-1 overflow-hidden">
        <TimelineChart issues={filteredIssues} baseUrl={data.source.baseUrl} viewMode={viewMode} zoom={zoom} onZoomChange={setZoom} scrollToTodayTrigger={scrollToTodayTrigger} hiddenTypes={hiddenTypes} />
      </div>
    </div>
  );
}
