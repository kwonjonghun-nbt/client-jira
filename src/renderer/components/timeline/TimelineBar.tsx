import { useState } from 'react';
import type { NormalizedIssue } from '../../types/jira.types';

interface TimelineBarProps {
  issue: NormalizedIssue;
  left: number;
  width: number;
  depth: number;
  baseUrl?: string;
}

const issueTypeBarColor: Record<string, string> = {
  epic: 'bg-purple-500',
  story: 'bg-blue-400',
  task: 'bg-emerald-400',
  'sub-task': 'bg-cyan-400',
  subtask: 'bg-cyan-400',
  bug: 'bg-red-400',
};

const depthBarColor: Record<number, string> = {
  0: 'bg-purple-400',
  1: 'bg-blue-400',
  2: 'bg-cyan-400',
};

const statusOverlay: Record<string, string> = {
  done: 'opacity-60',
  new: 'opacity-80',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

const issueTypeLabels: Record<string, string> = {
  epic: 'Epic',
  story: 'Story',
  task: 'Task',
  'sub-task': 'Sub-task',
  subtask: 'Sub-task',
  bug: 'Bug',
};

export default function TimelineBar({ issue, left, width, depth, baseUrl }: TimelineBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const barColor = issueTypeBarColor[issue.issueType.toLowerCase()] ?? depthBarColor[depth] ?? 'bg-gray-400';
  const overlay = statusOverlay[issue.statusCategory] ?? '';
  const minWidth = Math.max(width, 4);
  const showLabel = width > 60;
  const type = issue.issueType.toLowerCase();
  const isEpic = type === 'epic';
  const isSubtask = type === 'sub-task' || type === 'subtask';
  const barHeight = isEpic ? 'h-7' : isSubtask ? 'h-4' : 'h-5';
  const topOffset = isEpic ? 'top-0.5' : isSubtask ? 'top-2' : 'top-1';

  const issueUrl = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/browse/${issue.key}` : null;

  const handleClick = () => {
    if (issueUrl) {
      window.electronAPI.shell.openExternal(issueUrl);
    }
  };

  return (
    <div
      className={`absolute ${barHeight} ${topOffset}`}
      style={{ left, width: minWidth }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`w-full h-full rounded ${barColor} ${overlay} hover:opacity-70 transition-opacity cursor-pointer border-none p-0 flex items-center ${issue.statusCategory === 'done' ? 'bg-stripes' : ''}`}
      >
        {showLabel && (
          <span className="text-[10px] text-white font-medium px-1.5 truncate">
            {issue.key}
          </span>
        )}
      </button>

      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-1 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap pointer-events-none">
          <div className="font-medium mb-1">
            <span className="text-gray-400 mr-1">{issueTypeLabels[issue.issueType.toLowerCase()] ?? issue.issueType}</span>
            {issue.key}: {issue.summary}
          </div>
          <div className="text-gray-300 space-y-0.5">
            <div>상태: {issue.status}</div>
            {issue.assignee && <div>담당자: {issue.assignee}</div>}
            <div>생성: {formatDate(issue.created)}</div>
            {issue.dueDate && <div>마감: {formatDate(issue.dueDate)}</div>}
            {issue.storyPoints != null && <div>SP: {issue.storyPoints}</div>}
            {issue.parent && <div>상위: {issue.parent}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
