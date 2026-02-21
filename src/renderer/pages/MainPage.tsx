import IssueTable from '../components/issue/IssueTable';
import IssueFilters from '../components/issue/IssueFilters';
import IssueSearch from '../components/issue/IssueSearch';
import SyncButton from '../components/sync/SyncButton';
import SyncStatusDisplay from '../components/sync/SyncStatus';
import Spinner from '../components/common/Spinner';
import { useTeamIssues } from '../hooks/useTeamIssues';
import { useFilters } from '../hooks/useFilters';
import { useUIStore } from '../store/uiStore';

export default function MainPage() {
  const { data, isLoading, error } = useTeamIssues();
  const issues = data?.issues ?? [];
  const { filters, setFilter, toggleStatus, filteredIssues, filterOptions } = useFilters(issues);
  const setPage = useUIStore((s) => s.setPage);

  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 animate-pulse bg-gray-200 rounded" />
          <div className="flex gap-2">
            <div className="h-9 w-48 animate-pulse bg-gray-200 rounded-lg" />
            <div className="h-9 w-24 animate-pulse bg-gray-200 rounded-lg" />
          </div>
        </div>
        <div className="h-10 animate-pulse bg-gray-200 rounded-lg" />
        <div className="flex-1 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-700 mb-2">Client Jira</h2>
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
            <h1 className="text-lg font-bold text-gray-900">과제 목록</h1>
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
          <IssueSearch
            value={filters.search}
            onChange={(v) => setFilter('search', v)}
          />
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

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <IssueTable issues={filteredIssues} baseUrl={data.source.baseUrl} />
      </div>
    </div>
  );
}
