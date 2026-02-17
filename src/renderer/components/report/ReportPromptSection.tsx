import { useState } from 'react';
import type { NormalizedIssue } from '../../types/jira.types';

interface Props {
  assignee: string;
  setAssignee: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  assignees: string[];
  filteredIssues: NormalizedIssue[];
  promptText: string;
  copied: boolean;
  onCopyPrompt: () => void;
  onDownloadJson: () => void;
  onGenerateAI: () => void;
  aiRunning: boolean;
}

export default function ReportPromptSection({
  assignee,
  setAssignee,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  assignees,
  filteredIssues,
  promptText,
  copied,
  onCopyPrompt,
  onDownloadJson,
  onGenerateAI,
  aiRunning,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 px-6 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        리포트 생성 프롬프트
      </button>
      {open && (
        <div className="mt-3">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              담당자
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
              >
                <option value="전체">전체</option>
                {assignees.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              시작일
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              종료일
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
              />
            </label>
          </div>
          <div className="flex items-center gap-3 mb-3 p-2 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-600">
              해당 기간 이슈: <strong>{filteredIssues.length}건</strong>
            </span>
            <button
              type="button"
              onClick={onDownloadJson}
              disabled={filteredIssues.length === 0}
              className="px-3 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              이슈 데이터 다운로드 (.json)
            </button>
            <button
              type="button"
              onClick={onGenerateAI}
              disabled={filteredIssues.length === 0 || aiRunning}
              className="px-3 py-1 text-xs bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              AI 리포트 생성
            </button>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">아래 프롬프트를 복사하여 AI에게 붙여넣기하세요</span>
            <button
              type="button"
              onClick={onCopyPrompt}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
            >
              {copied ? '✓ 복사됨' : '복사'}
            </button>
          </div>
          <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto max-h-64 whitespace-pre-wrap leading-relaxed">
            {promptText}
          </pre>
        </div>
      )}
    </div>
  );
}
