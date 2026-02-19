import { useState, useMemo } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { uniq } from 'es-toolkit';
import type { NormalizedIssue } from '../../types/jira.types';
import { statusBadgeClass, getPriorityColor, normalizeType, issueTypeColors, getIssueTypeLabel } from '../../utils/issue';

interface TodayFocusProps {
  issues: NormalizedIssue[];
  onIssueClick: (issue: NormalizedIssue) => void;
}

function DueBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return null;
  const days = differenceInCalendarDays(parseISO(dueDate), new Date());

  if (days < 0) {
    return <span className="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-700 font-medium">D+{Math.abs(days)}</span>;
  }
  if (days === 0) {
    return <span className="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-700 font-medium">D-Day</span>;
  }
  if (days === 1) {
    return <span className="px-1.5 py-0.5 text-xs rounded bg-orange-100 text-orange-700 font-medium">D-1</span>;
  }
  if (days <= 3) {
    return <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-100 text-yellow-700 font-medium">D-{days}</span>;
  }
  return null;
}

function PriorityDot({ priority }: { priority: string | null }) {
  if (!priority) return null;
  const color = getPriorityColor(priority);
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`} title={priority} />
  );
}

export default function TodayFocus({ issues, onIssueClick }: TodayFocusProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<string> | null>(null);

  const issueTypes = useMemo(() => {
    return uniq(issues.map((i) => normalizeType(i.issueType))).sort();
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (!selectedTypes) return issues;
    return issues.filter((i) => selectedTypes.has(normalizeType(i.issueType)));
  }, [issues, selectedTypes]);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => {
      if (!prev) {
        // 전체 선택 상태 → 클릭한 타입만 제외
        const next = new Set(issueTypes);
        next.delete(type);
        return next.size === 0 ? null : next;
      }
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      // 모두 선택 또는 모두 해제 → 전체 보기로 복귀
      if (next.size === 0 || next.size === issueTypes.length) return null;
      return next;
    });
  };

  const isTypeActive = (type: string) => !selectedTypes || selectedTypes.has(type);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800">오늘의 업무</h2>
          <span className="text-sm text-gray-400">{filteredIssues.length}건</span>
        </div>
        {issueTypes.length > 1 && (
          <div className="flex items-center gap-1">
            {issueTypes.map((type) => {
              const active = isTypeActive(type);
              const colorClass = issueTypeColors[type] || 'bg-gray-100 text-gray-700';
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={`px-2 py-0.5 text-xs rounded cursor-pointer border-none transition-opacity ${colorClass} ${
                    active ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  {getIssueTypeLabel(type, type)}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {filteredIssues.length === 0 ? (
        <p className="text-gray-500 text-sm">오늘 집중할 업무가 없습니다</p>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue, idx) => (
            <div
              key={issue.key}
              onClick={() => onIssueClick(issue)}
              className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 rounded -mx-2 px-2 py-1 transition-colors"
            >
              <span className="text-xs text-gray-400 font-mono w-5 pt-0.5 shrink-0">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <PriorityDot priority={issue.priority} />
                  <span className="text-xs font-mono text-blue-600">{issue.key}</span>
                  <span className={`px-2 py-0.5 text-xs rounded ${statusBadgeClass(issue.statusCategory)}`}>
                    {issue.status}
                  </span>
                  <DueBadge dueDate={issue.dueDate} />
                </div>
                <p className="text-sm text-gray-800 truncate">{issue.summary}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  {issue.priority && <span>{issue.priority}</span>}
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
