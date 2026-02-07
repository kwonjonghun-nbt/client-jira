import { useMemo, useState } from 'react';
import TimelineChart from '../components/timeline/TimelineChart';
import type { ViewMode } from '../components/timeline/TimelineHeader';
import IssueFilters from '../components/issue/IssueFilters';
import MultiSelect from '../components/common/MultiSelect';
import SyncButton from '../components/sync/SyncButton';
import SyncStatusDisplay from '../components/sync/SyncStatus';
import Spinner from '../components/common/Spinner';
import { useJiraIssues } from '../hooks/useJiraIssues';
import { useFilters } from '../hooks/useFilters';
import { useUIStore } from '../store/uiStore';

const VIEW_MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'month', label: '월' },
  { value: 'week', label: '주' },
  { value: 'day', label: '일' },
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
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [zoom, setZoom] = useState(1);
  const [scrollToTodayTrigger, setScrollToTodayTrigger] = useState(1);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [activePreset, setActivePreset] = useState(30);
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

  // 실제 데이터에 존재하는 이슈타입 옵션 (중복 제거)
  const issueTypeOptions = useMemo(() => {
    const types = new Map<string, string>();
    for (const issue of dateFilteredIssues) {
      const key = issue.issueType.toLowerCase();
      if (!types.has(key)) types.set(key, issue.issueType);
    }
    return Array.from(types.entries()).map(([key, name]) => ({ value: key, label: name }));
  }, [dateFilteredIssues]);

  // 보이는 타입 = 전체 - hiddenTypes
  const visibleTypes = useMemo(
    () => issueTypeOptions.map((o) => o.value).filter((v) => !hiddenTypes.has(v)),
    [issueTypeOptions, hiddenTypes],
  );

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
            {/* 이슈타입 표시 토글 */}
            {issueTypeOptions.length > 0 && (
              <MultiSelect
                placeholder="이슈타입"
                options={issueTypeOptions}
                selected={visibleTypes}
                onToggle={toggleType}
              />
            )}
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
        {dateFilteredIssues.length}건 표시
        {dateFilteredIssues.length !== issues.length && ` (전체 ${issues.length}건)`}
      </div>

      {/* Timeline Chart */}
      <div className="flex-1 overflow-hidden">
        <TimelineChart issues={dateFilteredIssues} baseUrl={data.source.baseUrl} viewMode={viewMode} zoom={zoom} onZoomChange={setZoom} scrollToTodayTrigger={scrollToTodayTrigger} hiddenTypes={hiddenTypes} />
      </div>
    </div>
  );
}
