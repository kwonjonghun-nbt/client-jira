import { useMemo, useRef, useEffect } from 'react';
import { parseISO, differenceInCalendarDays, format, addDays, subDays, eachDayOfInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { TimelineSlideData, TimelineItem } from '../../../utils/daily-share';

const priorityBarColor: Record<string, string> = {
  Highest: 'bg-red-400',
  High: 'bg-orange-400',
  Medium: 'bg-blue-400',
  Low: 'bg-emerald-400',
  Lowest: 'bg-gray-400',
};

function DaysBadge({ days }: { days: number | null }) {
  if (days === null) return null;
  if (days < 0) {
    return (
      <span className="text-[10px] font-medium text-red-600">D+{Math.abs(days)}</span>
    );
  }
  if (days === 0) {
    return (
      <span className="text-[10px] font-medium text-amber-600">D-Day</span>
    );
  }
  return (
    <span className="text-[10px] font-medium text-emerald-600">D-{days}</span>
  );
}

/** Compute the date range to display: min(startDates) - 2d .. max(dueDates, today) + 3d */
function computeRange(issues: TimelineItem[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let minDate = today;
  let maxDate = today;

  for (const issue of issues) {
    const start = parseISO(issue.startDate.slice(0, 10));
    if (start < minDate) minDate = start;
    const end = issue.dueDate ? parseISO(issue.dueDate.slice(0, 10)) : today;
    if (end > maxDate) maxDate = end;
  }

  return {
    rangeStart: subDays(minDate, 2),
    rangeEnd: addDays(maxDate, 3),
    today,
  };
}

const ROW_HEIGHT = 40;
const LABEL_WIDTH = 180;
const DAY_COL_WIDTH = 32;

interface Props {
  data: TimelineSlideData;
}

export default function TimelineSlide({ data }: Props) {
  const { rangeStart, rangeEnd, today } = useMemo(() => computeRange(data.issues), [data.issues]);

  const days = useMemo(
    () => eachDayOfInterval({ start: rangeStart, end: rangeEnd }),
    [rangeStart, rangeEnd],
  );

  const totalDays = days.length;
  const chartWidth = totalDays * DAY_COL_WIDTH;

  const todayIdx = days.findIndex(
    (d) => format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'),
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (todayIdx < 0 || !scrollRef.current) return;
    const todayPx = todayIdx * DAY_COL_WIDTH;
    const containerWidth = scrollRef.current.clientWidth;
    scrollRef.current.scrollLeft = Math.max(0, todayPx - containerWidth / 3);
  }, [todayIdx]);

  return (
    <div className="flex flex-col gap-3 h-full">
      <h2 className="text-lg font-bold text-gray-800">
        진행 현황 <span className="text-sm font-normal text-gray-400">({data.issues.length}건)</span>
      </h2>

      <div ref={scrollRef} className="flex-1 overflow-x-auto">
        <div className="flex" style={{ minWidth: chartWidth + LABEL_WIDTH }}>
          {/* Left: issue labels */}
          <div className="shrink-0" style={{ width: LABEL_WIDTH }}>
            {/* Header spacer */}
            <div className="h-8 border-b border-gray-200 flex items-end pb-1 px-2">
              <span className="text-[10px] text-gray-400 font-medium">이슈</span>
            </div>
            {/* Issue rows */}
            {data.issues.map((issue) => (
              <div
                key={issue.key}
                className="flex items-center gap-1.5 px-2 border-b border-gray-100"
                style={{ height: ROW_HEIGHT }}
                title={`${issue.key}: ${issue.summary}`}
              >
                <span className="text-[10px] font-mono font-semibold text-blue-600 shrink-0">
                  {issue.key}
                </span>
                <span className="text-xs text-gray-700 truncate flex-1">{issue.summary}</span>
              </div>
            ))}
          </div>

          {/* Right: chart area */}
          <div className="relative" style={{ width: chartWidth }}>
            {/* Date header */}
            <div className="flex h-8 border-b border-gray-200">
              {days.map((day, idx) => {
                const isToday = idx === todayIdx;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const dayOfMonth = day.getDate();
                const isFirst = dayOfMonth === 1;
                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-center justify-end pb-0.5 border-r shrink-0
                      ${isToday ? 'bg-blue-50 border-r-blue-200' : isWeekend ? 'bg-gray-50 border-r-gray-100' : 'border-r-gray-100'}`}
                    style={{ width: DAY_COL_WIDTH }}
                  >
                    {isFirst && (
                      <span className="text-[8px] text-gray-400 leading-none">
                        {format(day, 'M월', { locale: ko })}
                      </span>
                    )}
                    <span className={`text-[10px] leading-none ${isToday ? 'font-bold text-blue-600' : isWeekend ? 'text-gray-400' : 'text-gray-500'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bars */}
            {data.issues.map((issue) => {
              const startDate = parseISO(issue.startDate.slice(0, 10));
              const endDate = issue.dueDate ? parseISO(issue.dueDate.slice(0, 10)) : today;

              const startIdx = differenceInCalendarDays(startDate, rangeStart);
              const barDays = Math.max(differenceInCalendarDays(endDate, startDate) + 1, 1);

              const leftPx = startIdx * DAY_COL_WIDTH;
              const widthPx = barDays * DAY_COL_WIDTH;

              const barColor = priorityBarColor[issue.priority ?? ''] ?? 'bg-blue-400';
              const isOverdue = issue.daysRemaining !== null && issue.daysRemaining < 0;

              return (
                <div
                  key={issue.key}
                  className="relative border-b border-gray-100"
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Today column highlight */}
                  {todayIdx >= 0 && (
                    <div
                      className="absolute top-0 bottom-0 bg-blue-50/60 pointer-events-none"
                      style={{ left: todayIdx * DAY_COL_WIDTH, width: DAY_COL_WIDTH }}
                    />
                  )}

                  {/* Bar */}
                  <div
                    className="absolute top-1.5 flex items-center group"
                    style={{ left: leftPx, width: widthPx, minWidth: 24 }}
                  >
                    <div
                      className={`h-6 w-full rounded ${barColor} ${isOverdue ? 'ring-2 ring-red-300' : ''} shadow-sm flex items-center px-1.5 gap-1 overflow-hidden transition-shadow group-hover:shadow-md`}
                    >
                      <span className="text-[10px] text-white font-medium truncate">
                        {issue.key}
                      </span>
                      {issue.storyPoints != null && (
                        <span className="text-[9px] text-white/70 shrink-0">{issue.storyPoints}SP</span>
                      )}
                    </div>

                    {/* D-day badge at end of bar */}
                    <div className="shrink-0 ml-1">
                      <DaysBadge days={issue.daysRemaining} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Today vertical line — inside relative chart area, scrolls with content */}
            {todayIdx >= 0 && (
              <div
                className="absolute top-0 bottom-0 w-px bg-red-400 z-10 pointer-events-none"
                style={{ left: (todayIdx + 0.5) * DAY_COL_WIDTH }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
