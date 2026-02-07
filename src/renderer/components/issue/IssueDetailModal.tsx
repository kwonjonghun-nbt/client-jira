import { useUIStore } from '../../store/uiStore';

const statusColors: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  indeterminate: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

const priorityColors: Record<string, string> = {
  Highest: 'text-red-600',
  High: 'text-orange-500',
  Medium: 'text-yellow-500',
  Low: 'text-blue-500',
  Lowest: 'text-gray-400',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function IssueDetailModal() {
  const issue = useUIStore((s) => s.selectedIssue);
  const baseUrl = useUIStore((s) => s.issueBaseUrl);
  const close = useUIStore((s) => s.closeIssueDetail);

  if (!issue) return null;

  const statusColor = statusColors[issue.statusCategory] ?? 'bg-gray-100 text-gray-700';
  const priorityColor = priorityColors[issue.priority ?? ''] ?? 'text-gray-400';
  const issueUrl = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/browse/${issue.key}` : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 min-w-0">
            {issueUrl ? (
              <button
                type="button"
                onClick={() => window.electronAPI.shell.openExternal(issueUrl)}
                className="font-mono text-sm text-blue-600 font-bold hover:underline cursor-pointer bg-transparent border-none p-0 shrink-0"
              >
                {issue.key}
              </button>
            ) : (
              <span className="font-mono text-sm text-blue-600 font-bold shrink-0">{issue.key}</span>
            )}
            <span className="text-xs text-gray-400 shrink-0">{issue.issueType}</span>
          </div>
          <button
            type="button"
            onClick={close}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer bg-transparent border-none text-lg"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{issue.summary}</h2>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-5">
            <div>
              <span className="text-gray-400 text-xs">상태</span>
              <div className="mt-0.5">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                  {issue.status}
                </span>
              </div>
            </div>
            <div>
              <span className="text-gray-400 text-xs">우선순위</span>
              <div className={`mt-0.5 font-medium ${priorityColor}`}>{issue.priority ?? '-'}</div>
            </div>
            <div>
              <span className="text-gray-400 text-xs">담당자</span>
              <div className="mt-0.5 text-gray-700">{issue.assignee ?? <span className="text-gray-300">미배정</span>}</div>
            </div>
            <div>
              <span className="text-gray-400 text-xs">보고자</span>
              <div className="mt-0.5 text-gray-700">{issue.reporter ?? '-'}</div>
            </div>
            <div>
              <span className="text-gray-400 text-xs">생성일</span>
              <div className="mt-0.5 text-gray-700">{formatDate(issue.created)}</div>
            </div>
            <div>
              <span className="text-gray-400 text-xs">마감일</span>
              <div className="mt-0.5 text-gray-700">{formatDate(issue.dueDate)}</div>
            </div>
            <div>
              <span className="text-gray-400 text-xs">스토리포인트</span>
              <div className="mt-0.5 text-gray-700">{issue.storyPoints ?? '-'}</div>
            </div>
            <div>
              <span className="text-gray-400 text-xs">스프린트</span>
              <div className="mt-0.5 text-gray-700">{issue.sprint ?? '-'}</div>
            </div>
            {issue.resolution && (
              <div>
                <span className="text-gray-400 text-xs">해결</span>
                <div className="mt-0.5 text-gray-700">{issue.resolution}</div>
              </div>
            )}
            {issue.parent && (
              <div>
                <span className="text-gray-400 text-xs">상위 이슈</span>
                <div className="mt-0.5 text-gray-700 font-mono text-xs">{issue.parent}</div>
              </div>
            )}
          </div>

          {/* Labels */}
          {issue.labels.length > 0 && (
            <div className="mb-4">
              <span className="text-gray-400 text-xs">라벨</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {issue.labels.map((label) => (
                  <span key={label} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Components */}
          {issue.components.length > 0 && (
            <div className="mb-4">
              <span className="text-gray-400 text-xs">컴포넌트</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {issue.components.map((comp) => (
                  <span key={comp} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {comp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks */}
          {issue.subtasks.length > 0 && (
            <div className="mb-4">
              <span className="text-gray-400 text-xs">하위 이슈</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {issue.subtasks.map((key) => (
                  <span key={key} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                    {key}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {issue.description && (
            <div>
              <span className="text-gray-400 text-xs">설명</span>
              <div className="mt-1 text-sm text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed">
                {issue.description}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {issueUrl && (
          <div className="border-t border-gray-200 px-6 py-3 flex justify-end">
            <button
              type="button"
              onClick={() => window.electronAPI.shell.openExternal(issueUrl)}
              className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
            >
              Jira에서 열기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
