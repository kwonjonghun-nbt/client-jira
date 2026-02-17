import { useMemo } from 'react';
import { eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval, format, getMonth } from 'date-fns';
import { ko } from 'date-fns/locale';

export type ViewMode = 'month' | 'week';

interface TimelineHeaderProps {
  rangeStart: Date;
  rangeEnd: Date;
  totalWidth: number;
  viewMode: ViewMode;
}

function getMonthTicks(start: Date, end: Date): Date[] {
  return eachMonthOfInterval({ start, end });
}

function getWeekTicks(start: Date, end: Date): Date[] {
  return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
}

function getDayTicks(start: Date, end: Date): Date[] {
  return eachDayOfInterval({ start, end });
}

function formatMonthLabel(date: Date): string {
  return getMonth(date) === 0
    ? format(date, 'yyyy년 M월', { locale: ko })
    : format(date, 'M월', { locale: ko });
}

function formatDayLabel(date: Date): string {
  return format(date, 'd(EEE)', { locale: ko });
}

export default function TimelineHeader({ rangeStart, rangeEnd, totalWidth, viewMode }: TimelineHeaderProps) {
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOffset = ((today.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
  const showToday = today >= rangeStart && today <= rangeEnd;

  let ticks: { date: Date; label: string; isMajor: boolean }[] = [];

  if (viewMode === 'month') {
    ticks = getMonthTicks(rangeStart, rangeEnd).map((d) => ({
      date: d,
      label: formatMonthLabel(d),
      isMajor: true,
    }));
  } else if (viewMode === 'week') {
    const days = getDayTicks(rangeStart, rangeEnd).map((d) => ({
      date: d,
      label: formatDayLabel(d),
      isMajor: false,
    }));
    const months = getMonthTicks(rangeStart, rangeEnd).map((d) => ({
      date: d,
      label: formatMonthLabel(d),
      isMajor: true,
    }));
    ticks = [...months, ...days];
  }

  const majorTicks = ticks.filter((t) => t.isMajor);
  const minorTicks = ticks.filter((t) => !t.isMajor);
  const hasTwoRows = minorTicks.length > 0;

  // 월 뷰: 오늘이 포함된 월 하이라이트
  const majorHighlights = useMemo(() => {
    if (viewMode !== 'month') return [];
    const highlights: { left: number; width: number }[] = [];
    for (let i = 0; i < majorTicks.length; i++) {
      const tickStart = majorTicks[i].date;
      const tickEnd = i + 1 < majorTicks.length ? majorTicks[i + 1].date : rangeEnd;
      if (today >= tickStart && today < tickEnd) {
        const left = ((tickStart.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
        const right = ((tickEnd.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
        highlights.push({ left, width: right - left });
      }
    }
    return highlights;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, rangeStart.getTime(), totalMs, totalWidth, majorTicks.length]);

  // 주 뷰: 오늘이 포함된 주 전체를 하이라이트
  const weekHighlights = useMemo(() => {
    if (viewMode !== 'week') return [];
    const weeks = getWeekTicks(rangeStart, rangeEnd);
    for (let i = 0; i < weeks.length; i++) {
      const wStart = weeks[i];
      const wEnd = i + 1 < weeks.length ? weeks[i + 1] : rangeEnd;
      if (today >= wStart && today < wEnd) {
        const left = ((wStart.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
        const right = ((wEnd.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
        return [{ left, width: right - left }];
      }
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, rangeStart.getTime(), rangeEnd.getTime(), totalMs, totalWidth]);

  // Monday offsets for full-height border lines
  const mondayOffsets = useMemo(() => {
    if (!hasTwoRows) return [];
    return minorTicks
      .filter((tick) => tick.date.getDay() === 1)
      .map((tick) => ((tick.date.getTime() - rangeStart.getTime()) / totalMs) * totalWidth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTwoRows, rangeStart.getTime(), totalMs, totalWidth, minorTicks.length]);

  const ROW_HEIGHT = hasTwoRows ? 28 : 40; // h-14=56px → 28+28, h-10=40px

  return (
    <div
      className={`relative border-b border-gray-200 bg-gray-50 ${hasTwoRows ? 'h-14' : 'h-10'}`}
      style={{ width: totalWidth }}
    >
      {/* ===== Row 1: Month labels (fixed pixel height) ===== */}
      <div className="relative" style={{ height: ROW_HEIGHT }}>
        {/* Month highlights (month view only) */}
        {majorHighlights.map((highlight, i) => (
          <div
            key={`major-hl-${i}`}
            className="absolute top-0 bg-blue-100/40 pointer-events-none"
            style={{ left: highlight.left, width: highlight.width, height: ROW_HEIGHT }}
          />
        ))}

        {/* Month tick borders + labels */}
        {majorTicks.map((tick) => {
          const offset = ((tick.date.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
          return (
            <div
              key={`major-${tick.date.toISOString()}`}
              className="absolute top-0"
              style={{ left: offset, height: ROW_HEIGHT }}
            >
              <div className="border-l border-gray-300 h-full" />
              <span className="absolute top-1 left-1.5 text-xs text-gray-600 font-medium whitespace-nowrap">
                {tick.label}
              </span>
            </div>
          );
        })}

        {/* Bottom border to separate rows */}
        {hasTwoRows && <div className="absolute bottom-0 left-0 right-0 border-b border-gray-200" />}
      </div>

      {/* ===== Row 2: Day labels (only in week view, fixed pixel height) ===== */}
      {hasTwoRows && (
        <div className="relative" style={{ height: ROW_HEIGHT }}>
          {/* Week highlight (confined to this row) */}
          {weekHighlights.map((highlight, i) => (
            <div
              key={`week-hl-${i}`}
              className="absolute top-0 bg-blue-100/50 pointer-events-none"
              style={{ left: highlight.left, width: highlight.width, height: ROW_HEIGHT }}
            />
          ))}

          {/* Day tick borders + labels */}
          {minorTicks.map((tick) => {
            const offset = ((tick.date.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
            const isMonday = tick.date.getDay() === 1;
            return (
              <div
                key={`minor-${tick.date.toISOString()}`}
                className="absolute top-0"
                style={{ left: offset, height: ROW_HEIGHT }}
              >
                <div
                  className="h-full"
                  style={isMonday
                    ? { borderLeft: '2px solid #94a3b8' }
                    : { borderLeft: '1px solid #e5e7eb' }
                  }
                />
                <span className={`absolute top-0.5 left-1 text-[10px] whitespace-nowrap ${isMonday ? 'text-gray-700 font-semibold' : 'text-gray-500'}`}>
                  {tick.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Spanning overlay: elements that cross both rows ===== */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Monday full-height border lines */}
        {mondayOffsets.map((offset, i) => (
          <div
            key={`mon-line-${i}`}
            className="absolute top-0 h-full"
            style={{ left: offset, borderLeft: '1px solid #cbd5e1' }}
          />
        ))}

        {/* Today line */}
        {showToday && (
          <div
            className="absolute top-0 h-full w-px bg-red-400 z-10"
            style={{ left: todayOffset }}
            title="오늘"
          />
        )}
      </div>
    </div>
  );
}
