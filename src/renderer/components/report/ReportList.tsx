import type { ReportMeta } from '../../types/jira.types';
import { formatReportDate } from '../../utils/reports';

interface Props {
  reports: ReportMeta[];
  deleting: string | null;
  onSelect: (filename: string) => void;
  onDelete: (filename: string) => void;
}

export default function ReportList({ reports, deleting, onSelect, onDelete }: Props) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg mb-1">리포트가 없습니다</p>
        <p className="text-sm">reports 폴더에 .md 파일을 추가하면 여기에 표시됩니다</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {reports.map((report) => (
        <div
          key={report.filename}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => onSelect(report.filename)}
            className="flex-1 flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-left"
          >
            <div>
              <div className="font-medium text-sm text-gray-800">{report.title}</div>
              <div className="text-xs text-gray-400 mt-1">
                수정일: {formatReportDate(report.modifiedAt)}
              </div>
            </div>
            <span className="text-gray-300 text-sm">→</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(report.filename)}
            disabled={deleting === report.filename}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="삭제"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
