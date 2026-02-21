import IssueFilters from '../components/issue/IssueFilters';
import SyncButton from '../components/sync/SyncButton';
import SyncStatusDisplay from '../components/sync/SyncStatus';
import Spinner from '../components/common/Spinner';
import DonutChart, { getSegmentColor } from '../components/stats/DonutChart';
import { useJiraIssues } from '../hooks/useJiraIssues';
import { useFilters } from '../hooks/useFilters';
import { useStatsPage } from '../hooks/useStatsPage';
import { useUIStore } from '../store/uiStore';
import { DATE_PRESETS } from '../utils/dashboard';

export default function StatsPage() {
  const { data, isLoading, error } = useJiraIssues();
  const issues = data?.issues ?? [];
  const { filters, setFilter, toggleStatus, filteredIssues, filterOptions } = useFilters(issues);
  const setPage = useUIStore((s) => s.setPage);

  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    viewMode,
    setViewMode,
    applyPreset,
    activePresetDays,
    labelStats,
    summary,
  } = useStatsPage(filteredIssues);

  if (isLoading && !data) {
    return (
      <div className="h-full p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 animate-pulse bg-gray-200 rounded" />
          <div className="h-9 w-24 animate-pulse bg-gray-200 rounded-lg" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 animate-pulse bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-700 mb-2">라벨별 통계</h2>
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
            <h1 className="text-lg font-bold text-gray-900">라벨별 통계</h1>
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
          <div className="flex items-center gap-2 shrink-0">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.days)}
                className={`px-3 py-1 text-xs rounded cursor-pointer border-none transition-colors ${
                  activePresetDays === p.days
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded"
            />
            <span className="text-xs text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 py-2 bg-red-50 text-red-600 text-sm">
          데이터 로드 오류: {error.message}
        </div>
      )}

      {/* Summary + View Toggle */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="text-xs text-gray-500">
            라벨 <span className="font-semibold text-gray-800">{summary.labelCount}</span>개
          </div>
          <div className="text-xs text-gray-500">
            이슈 <span className="font-semibold text-gray-800">{summary.totalIssues}</span>건
            <span className="text-gray-400 ml-1">(중복 포함)</span>
          </div>
          <div className="text-xs text-gray-500">
            완료 <span className="font-semibold text-emerald-600">{summary.totalCompleted}</span>건
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 text-xs rounded cursor-pointer border-none transition-colors ${
              viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            테이블
          </button>
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            className={`px-3 py-1 text-xs rounded cursor-pointer border-none transition-colors ${
              viewMode === 'chart' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            차트
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {labelStats.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-1">표시할 통계가 없습니다</p>
            <p className="text-sm">필터나 기간을 변경해보세요</p>
          </div>
        ) : viewMode === 'table' ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-2 text-xs font-medium text-gray-500">라벨</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 w-20">전체</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 w-20">완료</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 w-20">미완료</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-48">완료율</th>
              </tr>
            </thead>
            <tbody>
              {labelStats.map((stat, index) => (
                <tr
                  key={stat.label}
                  className={`border-b border-gray-100 ${index % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="px-6 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      stat.label === '(없음)'
                        ? 'bg-gray-100 text-gray-500 italic'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {stat.label}
                    </span>
                  </td>
                  <td className="text-right px-4 py-2 font-medium text-gray-800">{stat.total}</td>
                  <td className="text-right px-4 py-2 text-emerald-600 font-medium">{stat.completed}</td>
                  <td className="text-right px-4 py-2 text-orange-500 font-medium">{stat.incomplete}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(stat.rate, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">{stat.rate.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 flex items-start justify-center gap-10">
            <DonutChart
              size={280}
              strokeWidth={44}
              centerValue={String(summary.totalIssues)}
              centerLabel="총 이슈"
              segments={labelStats.map((s, i) => ({
                label: s.label,
                value: s.total,
                color: getSegmentColor(i),
              }))}
            />
            <div className="flex flex-col gap-1.5 pt-4 min-w-[200px]">
              {labelStats.map((s, i) => {
                const pct = summary.totalIssues > 0 ? (s.total / summary.totalIssues) * 100 : 0;
                return (
                  <div key={s.label} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getSegmentColor(i) }} />
                    <span className={`flex-1 truncate ${s.label === '(없음)' ? 'text-gray-400 italic' : 'text-gray-700'}`}>{s.label}</span>
                    <span className="text-gray-500 tabular-nums w-10 text-right">{s.total}건</span>
                    <span className="text-gray-800 font-medium tabular-nums w-14 text-right">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
