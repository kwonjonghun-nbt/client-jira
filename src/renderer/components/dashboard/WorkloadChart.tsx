interface WorkloadItem {
  name: string;
  count: number;
}

interface WorkloadChartProps {
  workload: WorkloadItem[];
  maxWorkload: number;
}

export default function WorkloadChart({ workload, maxWorkload }: WorkloadChartProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">담당자별 워크로드</h2>
      {workload.length === 0 ? (
        <p className="text-gray-500 text-sm">진행중인 이슈가 없습니다</p>
      ) : (
        <div className="space-y-3">
          {workload.map((w) => (
            <div key={w.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{w.name}</span>
                <span className="text-sm font-semibold text-gray-800">{w.count}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(w.count / maxWorkload) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
