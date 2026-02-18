import type { SummarySlideData } from '../../../utils/daily-share';

const statItems = [
  { key: 'inProgress', label: '진행중', color: 'text-blue-600 bg-blue-50' },
  { key: 'dueToday', label: '오늘 마감', color: 'text-emerald-600 bg-emerald-50' },
  { key: 'overdue', label: '지연', color: 'text-red-600 bg-red-50' },
  { key: 'atRisk', label: '리스크', color: 'text-amber-600 bg-amber-50' },
] as const;

interface Props {
  data: SummarySlideData;
}

export default function SummarySlide({ data }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8">
      {/* Title */}
      <h2 className="text-lg font-bold text-gray-800">요약</h2>

      {/* Stats row */}
      <div className="flex items-center gap-4">
        {statItems.map(({ key, label, color }) => (
          <div key={key} className={`flex flex-col items-center px-5 py-3 rounded-xl ${color}`}>
            <span className="text-2xl font-bold">{data.counts[key]}</span>
            <span className="text-xs font-medium mt-0.5">{label}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <p className="text-sm text-gray-500">
        총 <span className="font-semibold text-gray-800">{data.total}건</span>의 이슈가 있습니다.
      </p>

      {/* Highlights */}
      {data.highlights.length > 0 && (
        <div className="w-full max-w-lg space-y-2">
          {data.highlights.map((text, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 px-4 py-2.5 bg-gray-50 rounded-lg"
            >
              <span className="text-purple-500 mt-0.5 shrink-0">•</span>
              <span className="text-sm text-gray-700">{text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
