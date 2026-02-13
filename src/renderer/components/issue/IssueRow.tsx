import type { NormalizedIssue } from '../../types/jira.types';
import { useUIStore } from '../../store/uiStore';
import { normalizeType, issueTypeColors, statusBadgeClass, getPriorityColor, getIssueTypeLabel, buildIssueUrl } from '../../utils/issue';
import { formatDateShort } from '../../utils/formatters';

interface IssueRowProps {
  issue: NormalizedIssue;
  baseUrl?: string;
}

export default function IssueRow({ issue, baseUrl }: IssueRowProps) {
  const openIssueDetail = useUIStore((s) => s.openIssueDetail);
  const statusColor = statusBadgeClass(issue.statusCategory);
  const priorityColor = getPriorityColor(issue.priority);
  const normalizedType = normalizeType(issue.issueType);
  const typeColor = issueTypeColors[normalizedType] ?? 'bg-gray-100 text-gray-700';
  const typeLabel = getIssueTypeLabel(normalizedType, issue.issueType);
  const issueUrl = buildIssueUrl(baseUrl, issue.key);

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
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>
          {typeLabel}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <button
          type="button"
          onClick={() => openIssueDetail(issue, baseUrl)}
          className="text-gray-900 line-clamp-1 hover:text-blue-600 cursor-pointer bg-transparent border-none p-0 text-left text-sm"
        >
          {issue.summary}
        </button>
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
        {formatDateShort(issue.dueDate)}
      </td>
    </tr>
  );
}
