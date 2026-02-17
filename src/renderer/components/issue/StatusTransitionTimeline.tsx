import { format, parseISO } from 'date-fns';
import { formatTransitionDuration } from '../../utils/status-transitions';
import type { StatusTransitionAnalysis } from '../../types/jira.types';

interface StatusTransitionTimelineProps {
  analysis: StatusTransitionAnalysis | null | undefined;
  isLoading: boolean;
}

export default function StatusTransitionTimeline({ analysis, isLoading }: StatusTransitionTimelineProps) {
  if (isLoading) {
    return (
      <div className="mt-4">
        <span className="text-gray-400 text-xs">상태 전환 이력</span>
        <div className="mt-2 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse flex-1 max-w-[200px]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analysis || analysis.transitions.length === 0) {
    return (
      <div className="mt-4">
        <span className="text-gray-400 text-xs">상태 전환 이력</span>
        <p className="mt-1 text-sm text-gray-400">상태 변경 이력이 없습니다</p>
      </div>
    );
  }

  const { transitions, bottleneck, totalDurationMs } = analysis;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-gray-400 text-xs">상태 전환 이력</span>
        {totalDurationMs > 0 && (
          <span className="text-xs text-gray-400">
            · 총 {formatTransitionDuration(totalDurationMs)}
          </span>
        )}
      </div>
      <div className="relative">
        {transitions.map((t, idx) => {
          const isBottleneck =
            bottleneck &&
            t.fromStatus === bottleneck.fromStatus &&
            t.toStatus === bottleneck.toStatus &&
            t.durationMs === bottleneck.durationMs;

          return (
            <div key={idx}>
              {/* Duration between transitions */}
              {t.durationMs !== null && (
                <div className="flex items-center ml-[5px] my-0.5">
                  <div className="w-px h-6 bg-gray-200" />
                  <span
                    className={`ml-3 text-xs px-1.5 py-0.5 rounded ${
                      isBottleneck
                        ? 'bg-orange-100 text-orange-700 font-medium'
                        : 'text-gray-400'
                    }`}
                  >
                    {formatTransitionDuration(t.durationMs)}
                    {isBottleneck && ' · 병목'}
                  </span>
                </div>
              )}
              {/* Transition node */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    idx === transitions.length - 1
                      ? 'bg-blue-500'
                      : 'bg-gray-300'
                  }`}
                />
                <span className="text-sm text-gray-700">{t.toStatus}</span>
                <span className="text-xs text-gray-400">
                  {format(parseISO(t.transitionedAt), 'MM/dd HH:mm')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
