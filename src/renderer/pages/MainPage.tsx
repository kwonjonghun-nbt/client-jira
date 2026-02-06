import IssueTable from '../components/issue/IssueTable';
import IssueFilters from '../components/issue/IssueFilters';
import IssueSearch from '../components/issue/IssueSearch';
import SyncButton from '../components/sync/SyncButton';
import SyncStatusDisplay from '../components/sync/SyncStatus';
import Spinner from '../components/common/Spinner';
import { useJiraIssues } from '../hooks/useJiraIssues';
import { useFilters } from '../hooks/useFilters';
import { useUIStore } from '../store/uiStore';

export default function MainPage() {
  const { data, isLoading, error } = useJiraIssues();
  const issues = data?.issues ?? [];
  const { filters, setFilter, filteredIssues, filterOptions } = useFilters(issues);
  const setPage = useUIStore((s) => s.setPage);

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
          <h2 className="text-xl font-bold text-gray-700 mb-2">Client Jira</h2>
          <p className="text-gray-400 mb-4">아직 데이터가 없습니다</p>
          <p className="text-sm text-gray-400 mb-6">
            설정에서 Jira 연결을 구성한 후 싱크해주세요
          </p>
          <button
            onClick={() => setPage('settings')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            설정으로 이동
          </button>
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
        <IssueTable issues={filteredIssues} />
      </div>
    </div>
  );
}
