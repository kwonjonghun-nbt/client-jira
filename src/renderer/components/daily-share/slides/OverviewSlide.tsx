import type { OverviewSlideData } from '../../../utils/daily-share';

const categoryConfig = [
  { key: 'inProgress', label: '진행중', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'dueToday', label: '오늘 마감', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'overdue', label: '지연', color: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'atRisk', label: '리스크', color: 'bg-amber-50 text-amber-700 border-amber-200' },
] as const;

interface Props {
  data: OverviewSlideData;
}

export default function OverviewSlide({ data }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{data.assignee}</h1>
        <p className="text-sm text-gray-400 mt-1">{data.date} 기준</p>
      </div>

      {/* Total */}
      <div className="text-center">
        <span className="text-5xl font-extrabold text-gray-900">{data.total}</span>
        <p className="text-sm text-gray-500 mt-1">관련 이슈</p>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {categoryConfig.map(({ key, label, color }) => {
          const count = data.counts[key];
          return (
            <div
              key={key}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border ${color}`}
            >
              <span className="text-sm font-medium">{label}</span>
              <span className="text-lg font-bold">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
