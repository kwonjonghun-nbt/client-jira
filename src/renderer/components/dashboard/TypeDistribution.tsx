import { issueTypeColors } from '../../utils/issue';

const typeLabel: Record<string, string> = {
  epic: '에픽',
  story: '스토리',
  task: '작업',
  'sub-task': '하위작업',
  bug: '버그',
};

interface TypeDistributionItem {
  type: string;
  count: number;
}

interface TypeDistributionProps {
  distribution: TypeDistributionItem[];
}

export default function TypeDistribution({ distribution }: TypeDistributionProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">이슈 타입별 분포</h2>
      <div className="flex flex-wrap gap-3">
        {distribution.map((item) => {
          const colorClass = issueTypeColors[item.type] || 'bg-gray-100 text-gray-700';

          return (
            <div
              key={item.type}
              className={`px-4 py-2 rounded-lg ${colorClass} flex items-center gap-2`}
            >
              <span className="font-medium">{typeLabel[item.type] || item.type}</span>
              <span className="font-bold">{item.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
