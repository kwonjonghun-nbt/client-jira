import SyncButton from '../components/sync/SyncButton';
import SyncStatusDisplay from '../components/sync/SyncStatus';
import Spinner from '../components/common/Spinner';
import SummaryCards from '../components/dashboard/SummaryCards';
import DueThisWeek from '../components/dashboard/DueThisWeek';
import WorkloadChart from '../components/dashboard/WorkloadChart';
import RecentUpdates from '../components/dashboard/RecentUpdates';
import TypeDistribution from '../components/dashboard/TypeDistribution';
import ChangeTracking from '../components/dashboard/ChangeTracking';
import { useJiraIssues } from '../hooks/useJiraIssues';
import { useChangelog } from '../hooks/useChangelog';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useUIStore } from '../store/uiStore';
import { DATE_PRESETS } from '../utils/dashboard';

export default function DashboardPage() {
  const { data, isLoading } = useJiraIssues();
  const { data: changelog } = useChangelog();
  const setPage = useUIStore((s) => s.setPage);
  const openIssueDetail = useUIStore((s) => s.openIssueDetail);
  const {
    filteredIssues,
    stats,
    dateStart,
    dateEnd,
    activePreset,
    applyDatePreset,
    setDateStart,
    setDateEnd,
    assigneeFilter,
    setAssigneeFilter,
    assignees,
  } = useDashboardStats(data?.issues);

  if (isLoading) {
    return (
      <div className="h-full p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse bg-gray-200 rounded" />
          <div className="h-9 w-24 animate-pulse bg-gray-200 rounded-lg" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 animate-pulse bg-gray-200 rounded-xl" />
          <div className="h-64 animate-pulse bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data || !stats) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-500">
        <p>동기화된 데이터가 없습니다</p>
        <div className="flex gap-3">
          <button
            onClick={() => setPage('settings')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            설정으로 이동
          </button>
          <SyncButton />
        </div>
      </div>
    );
  }

  const baseUrl = data.source.baseUrl;

  return (
    <div className="h-full overflow-auto px-6">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-6 py-4 -mx-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">대시보드</h1>
            <SyncStatusDisplay
              syncedAt={data.syncedAt}
              totalCount={data.totalCount}
              projects={data.source.projects}
            />
          </div>
          <SyncButton />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
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
            onChange={(e) => { setDateStart(e.target.value); }}
            className="px-1.5 py-1 text-xs border border-gray-300 rounded w-28"
          />
          <span className="text-xs text-gray-400">~</span>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => { setDateEnd(e.target.value); }}
            className="px-1.5 py-1 text-xs border border-gray-300 rounded w-28"
          />
          <span className="text-xs text-gray-300 mx-1">|</span>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-1.5 py-1 text-xs border border-gray-300 rounded bg-white min-w-[100px]"
          >
            <option value="전체">담당자: 전체</option>
            {assignees.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400 ml-2">
            {filteredIssues.length}건 표시
            {filteredIssues.length !== data.issues.length && ` (전체 ${data.issues.length}건)`}
          </span>
        </div>
      </div>

      <SummaryCards
        totalCount={stats.totalCount}
        inProgressCount={stats.inProgressCount}
        doneCount={stats.doneCount}
        newCount={stats.newCount}
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <DueThisWeek issues={stats.dueThisWeek} />
        <WorkloadChart workload={stats.workload} maxWorkload={stats.maxWorkload} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <RecentUpdates
          issues={stats.recentlyUpdated}
          onIssueClick={(issue) => openIssueDetail(issue.key, baseUrl)}
        />
        <TypeDistribution distribution={stats.typeDistribution} />
      </div>

      <ChangeTracking changelog={changelog} />
    </div>
  );
}
