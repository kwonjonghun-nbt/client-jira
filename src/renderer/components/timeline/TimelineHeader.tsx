export type ViewMode = 'month' | 'week' | 'day';

interface TimelineHeaderProps {
  rangeStart: Date;
  rangeEnd: Date;
  totalWidth: number;
  viewMode: ViewMode;
}

function getMonthTicks(start: Date, end: Date): Date[] {
  const ticks: Date[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  while (current <= end) {
    ticks.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  return ticks;
}

function getWeekTicks(start: Date, end: Date): Date[] {
  const ticks: Date[] = [];
  const current = new Date(start);
  // 월요일로 정렬
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);
  while (current <= end) {
    ticks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return ticks;
}

function getDayTicks(start: Date, end: Date): Date[] {
  const ticks: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  while (current <= end) {
    ticks.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return ticks;
}

function formatMonthLabel(date: Date): string {
  const month = date.getMonth() + 1;
  return month === 1 ? `${date.getFullYear()}년 ${month}월` : `${month}월`;
}

function formatWeekLabel(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d}`;
}

function formatDayLabel(date: Date): string {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const d = date.getDate();
  const dayName = dayNames[date.getDay()];
  return `${d}(${dayName})`;
}

export default function TimelineHeader({ rangeStart, rangeEnd, totalWidth, viewMode }: TimelineHeaderProps) {
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();

  const today = new Date();
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
    // 상단에 월 라벨, 하단에 주 라벨
    const weeks = getWeekTicks(rangeStart, rangeEnd).map((d) => ({
      date: d,
      label: formatWeekLabel(d),
      isMajor: false,
    }));
    const months = getMonthTicks(rangeStart, rangeEnd).map((d) => ({
      date: d,
      label: formatMonthLabel(d),
      isMajor: true,
    }));
    ticks = [...months, ...weeks];
  } else {
    // day: 상단에 월, 하단에 일
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

  return (
    <div
      className={`relative border-b border-gray-200 bg-gray-50 ${hasTwoRows ? 'h-14' : 'h-10'}`}
      style={{ width: totalWidth }}
    >
      {/* Major ticks (month labels) */}
      {majorTicks.map((tick) => {
        const offset = ((tick.date.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
        return (
          <div key={`major-${tick.date.toISOString()}`} className="absolute top-0" style={{ left: offset, height: hasTwoRows ? '50%' : '100%' }}>
            <div className="border-l border-gray-300 h-full" />
            <span className="absolute top-1 left-1.5 text-xs text-gray-600 font-medium whitespace-nowrap">
              {tick.label}
            </span>
          </div>
        );
      })}

      {/* Minor ticks (week/day labels) */}
      {minorTicks.map((tick) => {
        const offset = ((tick.date.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
        return (
          <div key={`minor-${tick.date.toISOString()}`} className="absolute bottom-0" style={{ left: offset, height: '50%' }}>
            <div className="border-l border-gray-200 h-full" />
            <span className="absolute top-0.5 left-1 text-[10px] text-gray-500 whitespace-nowrap">
              {tick.label}
            </span>
          </div>
        );
      })}

      {/* Today line */}
      {showToday && (
        <div
          className="absolute top-0 h-full w-px bg-red-400 z-10"
          style={{ left: todayOffset }}
          title="오늘"
        />
      )}
    </div>
  );
}
