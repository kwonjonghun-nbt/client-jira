import type { NormalizedIssue } from '../../types/jira.types';
import { normalizeType, issueTypeColors, statusBadgeClass } from '../../utils/issue';
import { formatRelativeTime } from '../../utils/formatters';

interface RecentUpdatesProps {
  issues: NormalizedIssue[];
  onIssueClick: (issue: NormalizedIssue) => void;
}

export default function RecentUpdates({ issues, onIssueClick }: RecentUpdatesProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">최근 업데이트 이슈</h2>
      <div className="space-y-3">
        {issues.map((issue) => {
          const normalized = normalizeType(issue.issueType);
          const colorClass = issueTypeColors[normalized] || 'bg-gray-100 text-gray-700';

          return (
            <div
              key={issue.key}
              onClick={() => onIssueClick(issue)}
              className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
            >
              <span className={`px-2 py-1 text-xs rounded font-medium ${colorClass}`}>
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
  );
}
