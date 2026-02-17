import SyncButton from '../components/sync/SyncButton';
import SyncStatusDisplay from '../components/sync/SyncStatus';
import Spinner from '../components/common/Spinner';
import DailyShareModal from '../components/dashboard/DailyShareModal';
import { useJiraIssues } from '../hooks/useJiraIssues';
import { useChangelog } from '../hooks/useChangelog';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useDailyShare } from '../hooks/useDailyShare';
import { useUIStore } from '../store/uiStore';
import { normalizeType, issueTypeColors, statusBadgeClass } from '../utils/issue';
import { formatRelativeTime } from '../utils/formatters';
import { DATE_PRESETS, changeTypeConfig, formatChangeValue } from '../utils/dashboard';

const typeLabel: Record<string, string> = {
  epic: '에픽',
  story: '스토리',
  task: '작업',
  'sub-task': '하위작업',
  bug: '버그',
};

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

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 이슈</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {stats.totalCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">진행중</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {stats.inProgressCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">완료</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {stats.doneCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">미착수</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats.newCount}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Due This Week */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            이번 주 마감 이슈
          </h2>
          {stats.dueThisWeek.length === 0 ? (
            <p className="text-gray-500 text-sm">이번 주 마감 이슈가 없습니다</p>
          ) : (
            <div className="space-y-3">
              {stats.dueThisWeek.map((issue) => (
                <div
                  key={issue.key}
                  className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-blue-600">
                        {issue.key}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded ${statusBadgeClass(issue.statusCategory)}`}>
                        {issue.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 truncate">{issue.summary}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>
                        {new Date(issue.dueDate!).toLocaleDateString('ko-KR')}
                      </span>
                      {issue.assignee && <span>· {issue.assignee}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workload by Assignee */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            담당자별 워크로드
          </h2>
          {stats.workload.length === 0 ? (
            <p className="text-gray-500 text-sm">진행중인 이슈가 없습니다</p>
          ) : (
            <div className="space-y-3">
              {stats.workload.map((w) => (
                <div key={w.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{w.name}</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {w.count}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(w.count / stats.maxWorkload) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Second Two Column Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Recently Updated */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            최근 업데이트 이슈
          </h2>
          <div className="space-y-3">
            {stats.recentlyUpdated.map((issue) => {
              const normalized = normalizeType(issue.issueType);
              const colorClass =
                issueTypeColors[normalized] || 'bg-gray-100 text-gray-700';

              return (
                <div
                  key={issue.key}
                  onClick={() => openIssueDetail(issue, baseUrl)}
                  className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
                >
                  <span
                    className={`px-2 py-1 text-xs rounded font-medium ${colorClass}`}
                  >
                    {issue.key}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{issue.summary}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{formatRelativeTime(issue.updated)}</span>
                      <span>·</span>
                      <span className={`px-1.5 py-0.5 rounded ${statusBadgeClass(issue.statusCategory)}`}>
                        {issue.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Issue Type Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            이슈 타입별 분포
          </h2>
          <div className="flex flex-wrap gap-3">
            {stats.typeDistribution.map((item) => {
              const colorClass =
                issueTypeColors[item.type] || 'bg-gray-100 text-gray-700';

              return (
                <div
                  key={item.type}
                  className={`px-4 py-2 rounded-lg ${colorClass} flex items-center gap-2`}
                >
                  <span className="font-medium">
                    {typeLabel[item.type] || item.type}
                  </span>
                  <span className="font-bold">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Change Tracking */}
      <div className="mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">최근 변경 추적</h2>
            {changelog && changelog.entries.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {changelog.entries.length}
              </span>
            )}
          </div>
          {!changelog || changelog.entries.length === 0 ? (
            <p className="text-gray-500 text-sm">변경사항이 없습니다</p>
          ) : (
            <div className="space-y-3">
              {changelog.entries.slice(0, 15).map((entry, idx) => {
                const config = changeTypeConfig[entry.changeType];
                return (
                  <div
                    key={`${entry.issueKey}-${entry.changeType}-${idx}`}
                    className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0"
                  >
                    <span className={`px-2 py-0.5 text-xs rounded font-medium shrink-0 ${config.color}`}>
                      {config.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-blue-600">{entry.issueKey}</span>
                        <span className="text-sm text-gray-800 truncate">{entry.summary}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{formatChangeValue(entry)}</span>
                        <span>· {formatRelativeTime(entry.detectedAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {dailyShare.showModal && (
        <DailyShareModal
          ai={dailyShare.ai}
          saving={dailyShare.saving}
          onSave={dailyShare.handleSave}
          onClose={dailyShare.handleClose}
        />
      )}
    </div>
  );
}
