import type { ChangelogEntry } from '../../types/jira.types';
import { changeTypeConfig, formatChangeValue } from '../../utils/dashboard';
import { formatRelativeTime } from '../../utils/formatters';

interface ChangeTrackingProps {
  changelog: { entries: ChangelogEntry[] } | null | undefined;
}

export default function ChangeTracking({ changelog }: ChangeTrackingProps) {
  return (
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
  );
}
