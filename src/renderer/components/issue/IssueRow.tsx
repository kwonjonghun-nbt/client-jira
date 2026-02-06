import type { NormalizedIssue } from '../../types/jira.types';

interface IssueRowProps {
  issue: NormalizedIssue;
  baseUrl?: string;
}

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
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

export default function IssueRow({ issue, baseUrl }: IssueRowProps) {
  const statusColor = statusColors[issue.statusCategory] || 'bg-gray-100 text-gray-700';
  const priorityColor = priorityColors[issue.priority || ''] || 'text-gray-400';
  const issueUrl = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/browse/${issue.key}` : null;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-2.5">
        {issueUrl ? (
          <button
            type="button"
            onClick={() => window.electronAPI.shell.openExternal(issueUrl)}
            className="font-mono text-xs text-blue-600 font-medium hover:underline cursor-pointer bg-transparent border-none p-0"
          >
            {issue.key}
          </button>
        ) : (
          <span className="font-mono text-xs text-blue-600 font-medium">{issue.key}</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <span className="text-gray-900 line-clamp-1">{issue.summary}</span>
        {issue.sprint && (
          <span className="ml-2 text-xs text-gray-400">{issue.sprint}</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
          {issue.status}
        </span>
      </td>
      <td className="px-4 py-2.5 text-gray-600 truncate max-w-24">
        {issue.assignee || <span className="text-gray-300">미배정</span>}
      </td>
      <td className="px-4 py-2.5">
        <span className={`text-xs font-medium ${priorityColor}`}>
          {issue.priority || '-'}
        </span>
      </td>
      <td className="px-4 py-2.5 text-center text-gray-600">
        {issue.storyPoints ?? '-'}
      </td>
      <td className="px-4 py-2.5 text-gray-500 text-xs">
        {formatDate(issue.dueDate)}
      </td>
    </tr>
  );
}
