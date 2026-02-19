import SyncButton from '../components/sync/SyncButton';
import SyncStatusDisplay from '../components/sync/SyncStatus';
import Spinner from '../components/common/Spinner';
import SummaryCards from '../components/dashboard/SummaryCards';
import DueThisWeek from '../components/dashboard/DueThisWeek';
import WorkloadChart from '../components/dashboard/WorkloadChart';
import RecentUpdates from '../components/dashboard/RecentUpdates';
import TypeDistribution from '../components/dashboard/TypeDistribution';
import ChangeTracking from '../components/dashboard/ChangeTracking';
import TodayFocus from '../components/dashboard/TodayFocus';
import { useJiraIssues } from '../hooks/useJiraIssues';
import { useChangelog } from '../hooks/useChangelog';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useDailyShare } from '../hooks/useDailyShare';
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
  const dailyShare = useDailyShare(data?.issues);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
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

      {/* Daily Share */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">오늘의 이슈공유</h2>
        <div className="flex items-center gap-3">
          <select
            value={dailyShare.assignee}
            onChange={(e) => dailyShare.setAssignee(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white min-w-[140px]"
          >
            <option value="전체">전체</option>
            {dailyShare.assignees.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={dailyShare.handleGenerateFromData}
            disabled={!dailyShare.assignee || dailyShare.totalCount === 0}
            className="px-4 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            데이터 기반 생성
          </button>
          <button
            type="button"
            onClick={dailyShare.handleGenerate}
            disabled={!dailyShare.assignee || dailyShare.totalCount === 0 || dailyShare.ai.status === 'running'}
            className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            AI 이슈공유 생성
          </button>
          {dailyShare.assignee && dailyShare.categories && (
            <span className="text-xs text-gray-500">
              진행 {dailyShare.categories.inProgress.length} · 오늘마감 {dailyShare.categories.dueToday.length} · 지연 {dailyShare.categories.overdue.length} · 리스크 {dailyShare.categories.atRisk.length}
            </span>
          )}
        </div>
      </div>

      <TodayFocus
        issues={stats.todayFocus}
        onIssueClick={(issue) => openIssueDetail(issue, baseUrl)}
      />

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
          onIssueClick={(issue) => openIssueDetail(issue, baseUrl)}
        />
        <TypeDistribution distribution={stats.typeDistribution} />
      </div>

      <ChangeTracking changelog={changelog} />
    </div>
  );
}
