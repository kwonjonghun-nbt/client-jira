import type { TicketSlideData } from '../../../utils/daily-share';

const severityStyles = {
  info: {
    header: 'bg-emerald-500',
    card: 'border-emerald-200 hover:border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  warning: {
    header: 'bg-amber-500',
    card: 'border-amber-200 hover:border-amber-300',
    badge: 'bg-amber-100 text-amber-700',
  },
  danger: {
    header: 'bg-red-500',
    card: 'border-red-200 hover:border-red-300',
    badge: 'bg-red-100 text-red-700',
  },
};

const priorityColor: Record<string, string> = {
  Highest: 'text-red-500',
  High: 'text-orange-500',
  Medium: 'text-yellow-500',
  Low: 'text-green-500',
  Lowest: 'text-gray-400',
};

interface Props {
  data: TicketSlideData;
}

export default function TicketCardSlide({ data }: Props) {
  const styles = severityStyles[data.severity];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className={`w-1 h-6 rounded-full ${styles.header}`} />
        <h2 className="text-lg font-bold text-gray-800">{data.label}</h2>
        <span className="text-sm text-gray-400">{data.issues.length}건</span>
      </div>

      {/* Ticket cards grid */}
      <div className={`grid gap-3 ${data.issues.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {data.issues.map((issue) => (
          <div
            key={issue.key}
            className={`bg-white border-2 rounded-lg p-4 shadow-sm transition-all ${styles.card}`}
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-blue-600">{issue.key}</span>
              {issue.priority && (
                <span className={`text-xs font-medium ${priorityColor[issue.priority] ?? 'text-gray-400'}`}>
                  {issue.priority}
                </span>
              )}
            </div>

            {/* Summary */}
            <p className="text-sm text-gray-800 font-medium leading-snug line-clamp-2 mb-3">
              {issue.summary}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                {issue.status}
              </span>

              {data.category === 'overdue' && issue.delayDays != null ? (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
                  {issue.delayDays}일 지연
                </span>
              ) : issue.dueDate ? (
                <span className="text-xs text-gray-400">{issue.dueDate.slice(0, 10)}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
