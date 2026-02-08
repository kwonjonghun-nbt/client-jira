import { useMemo, useState, useRef, useEffect } from 'react';
import TimelineChart from '../components/timeline/TimelineChart';
import type { ViewMode } from '../components/timeline/TimelineHeader';
import IssueFilters from '../components/issue/IssueFilters';
import SyncButton from '../components/sync/SyncButton';
import SyncStatusDisplay from '../components/sync/SyncStatus';
import Spinner from '../components/common/Spinner';
import { useJiraIssues } from '../hooks/useJiraIssues';
import { useFilters } from '../hooks/useFilters';
import { useUIStore } from '../store/uiStore';

const VIEW_MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'month', label: '월' },
  { value: 'week', label: '주' },
];

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

const DATE_PRESETS = [
  { label: '1개월', days: 30 },
  { label: '3개월', days: 90 },
  { label: '6개월', days: 180 },
  { label: '전체', days: 0 },
];

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function TimelinePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [zoom, setZoom] = useState(1);
  const [scrollToTodayTrigger, setScrollToTodayTrigger] = useState(1);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [hiddenRowTypes, setHiddenRowTypes] = useState<Set<string>>(new Set());
  const [activePreset, setActivePreset] = useState(30);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [dateStart, setDateStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDate(d);
  });
  const [dateEnd, setDateEnd] = useState(() => formatDate(new Date()));
  const { data, isLoading, error } = useJiraIssues();
  const issues = data?.issues ?? [];
  const { filters, setFilter, toggleStatus, filteredIssues, filterOptions } = useFilters(issues);
  const setPage = useUIStore((s) => s.setPage);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const applyDatePreset = (days: number) => {
    setActivePreset(days);
    if (days === 0) {
      setDateStart('');
      setDateEnd('');
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      setDateStart(formatDate(start));
      setDateEnd(formatDate(end));
    }
  };

  // 기간 필터: created 또는 dueDate가 선택 기간과 겹치면 표시
  const dateFilteredIssues = useMemo(() => {
    if (!dateStart && !dateEnd) return filteredIssues;
    const startMs = dateStart ? new Date(dateStart).getTime() : 0;
    const endMs = dateEnd ? new Date(dateEnd + 'T23:59:59').getTime() : Infinity;

    return filteredIssues.filter((issue) => {
      const createdMs = new Date(issue.created).getTime();
      const dueMs = issue.dueDate ? new Date(issue.dueDate).getTime() : null;
      // created가 기간 안에 있거나, dueDate가 기간 안에 있거나, 이슈 기간이 선택 기간을 감싸는 경우
      const createdInRange = createdMs >= startMs && createdMs <= endMs;
      const dueInRange = dueMs !== null && dueMs >= startMs && dueMs <= endMs;
      const spansRange = dueMs !== null && createdMs <= startMs && dueMs >= endMs;
      return createdInRange || dueInRange || spansRange;
    });
  }, [filteredIssues, dateStart, dateEnd]);

  const displayedIssues = useMemo(() => {
    if (hiddenRowTypes.size === 0) return dateFilteredIssues;
    return dateFilteredIssues.filter((issue) => !hiddenRowTypes.has(issue.issueType.toLowerCase()));
  }, [dateFilteredIssues, hiddenRowTypes]);

  // 실제 데이터에 존재하는 이슈타입 옵션 (중복 제거)
  const issueTypeOptions = useMemo(() => {
    const types = new Map<string, string>();
    for (const issue of dateFilteredIssues) {
      const key = issue.issueType.toLowerCase();
      if (!types.has(key)) types.set(key, issue.issueType);
    }
    return Array.from(types.entries()).map(([key, name]) => ({ value: key, label: name }));
  }, [dateFilteredIssues]);

  const toggleType = (typeKey: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeKey)) next.delete(typeKey);
      else next.add(typeKey);
      return next;
    });
  };

  const toggleRowType = (typeKey: string) => {
    setHiddenRowTypes((prev) => {
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

        <IssueFilters
          filters={filters}
          filterOptions={filterOptions}
          onChangeFilter={setFilter}
          onToggleStatus={toggleStatus}
        />

        <div className="flex items-center justify-between mt-3">
          {/* 기간 필터 */}
          <div className="flex items-center gap-1">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyDatePreset(p.days)}
                className={`px-2 py-1 text-xs rounded cursor-pointer border-none transition-colors ${
                  activePreset === p.days
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
            <input
              type="date"
              value={dateStart}
              onChange={(e) => { setDateStart(e.target.value); setActivePreset(-1); }}
              className="px-1.5 py-1 text-xs border border-gray-300 rounded w-28"
            />
            <span className="text-xs text-gray-400">~</span>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => { setDateEnd(e.target.value); setActivePreset(-1); }}
              className="px-1.5 py-1 text-xs border border-gray-300 rounded w-28"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* 타임라인 설정 */}
            {issueTypeOptions.length > 0 && (
              <div ref={settingsRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((v) => !v)}
                  className="w-7 h-7 flex items-center justify-center text-sm rounded cursor-pointer border-none bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                  title="타임라인 설정"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                {settingsOpen && (
                  <div className="absolute right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[280px]">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-700">타임라인 설정</span>
                    </div>
                    <div className="px-3 py-1.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="flex-1 text-[11px] font-medium text-gray-500">이슈타입</span>
                        <span className="w-12 text-center text-[10px] text-gray-400">바</span>
                        <span className="w-12 text-center text-[10px] text-gray-400">로우</span>
                      </div>
                      {issueTypeOptions.map((opt) => {
                        const barVisible = !hiddenTypes.has(opt.value);
                        const rowVisible = !hiddenRowTypes.has(opt.value);
                        return (
                          <div key={opt.value} className="flex items-center gap-2 py-1">
                            <span className="flex-1 text-xs text-gray-700">{opt.label}</span>
                            <div className="w-12 flex justify-center">
                              <button
                                type="button"
                                onClick={() => toggleType(opt.value)}
                                className={`w-8 h-4 rounded-full transition-colors cursor-pointer border-none relative ${barVisible ? 'bg-blue-500' : 'bg-gray-300'}`}
                              >
                                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${barVisible ? 'left-4' : 'left-0.5'}`} />
                              </button>
                            </div>
                            <div className="w-12 flex justify-center">
                              <button
                                type="button"
                                onClick={() => toggleRowType(opt.value)}
                                className={`w-8 h-4 rounded-full transition-colors cursor-pointer border-none relative ${rowVisible ? 'bg-blue-500' : 'bg-gray-300'}`}
                              >
                                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${rowVisible ? 'left-4' : 'left-0.5'}`} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
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
        {displayedIssues.length}건 표시
        {displayedIssues.length !== issues.length && ` (전체 ${issues.length}건)`}
      </div>

      {/* Timeline Chart */}
      <div className="flex-1 overflow-hidden relative">
        <TimelineChart issues={dateFilteredIssues} baseUrl={data.source.baseUrl} viewMode={viewMode} zoom={zoom} onZoomChange={setZoom} scrollToTodayTrigger={scrollToTodayTrigger} hiddenTypes={hiddenTypes} hiddenRowTypes={hiddenRowTypes} />

        {/* Floating controls */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg px-2 py-1.5">
          {controlsCollapsed ? (
            <button
              type="button"
              onClick={() => setControlsCollapsed(false)}
              className="w-7 h-7 flex items-center justify-center text-sm rounded cursor-pointer border-none bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              title="컨트롤 펼치기"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <>
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
              <div className="w-px h-5 bg-gray-200" />
              <button
                type="button"
                onClick={() => setScrollToTodayTrigger((t) => t + 1)}
                className="px-3 py-1 text-xs rounded cursor-pointer border-none bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                오늘
              </button>
              <div className="w-px h-5 bg-gray-200" />
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
              <div className="w-px h-5 bg-gray-200" />
              <button
                type="button"
                onClick={() => setControlsCollapsed(true)}
                className="w-7 h-7 flex items-center justify-center text-sm rounded cursor-pointer border-none bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                title="컨트롤 접기"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
