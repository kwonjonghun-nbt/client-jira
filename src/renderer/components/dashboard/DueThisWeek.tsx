import { format, parseISO } from 'date-fns';
import type { NormalizedIssue } from '../../types/jira.types';
import { statusBadgeClass } from '../../utils/issue';

interface DueThisWeekProps {
  issues: NormalizedIssue[];
}

export default function DueThisWeek({ issues }: DueThisWeekProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">이번 주 마감 이슈</h2>
      {issues.length === 0 ? (
        <p className="text-gray-500 text-sm">이번 주 마감 이슈가 없습니다</p>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div
              key={issue.key}
              className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-blue-600">{issue.key}</span>
                  <span className={`px-2 py-0.5 text-xs rounded ${statusBadgeClass(issue.statusCategory)}`}>
                    {issue.status}
                  </span>
                </div>
                <p className="text-sm text-gray-800 truncate">{issue.summary}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{format(parseISO(issue.dueDate!), 'yyyy. MM. dd.')}</span>
                  {issue.assignee && <span>· {issue.assignee}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
