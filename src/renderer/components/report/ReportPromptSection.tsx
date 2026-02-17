import { useState, useRef, useEffect } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="border-b border-gray-200 px-6 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        리포트 생성
      </button>
      {open && (
        <div className="mt-3">
          {/* Filter row */}
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

          {/* Main action row */}
          <div className="flex items-center gap-3 mb-3 p-2 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-600 flex-1">
              해당 기간 이슈: <strong>{filteredIssues.length}건</strong>
            </span>
            <button
              type="button"
              onClick={onGenerateAI}
              disabled={filteredIssues.length === 0 || aiRunning}
              className="px-4 py-1.5 text-xs font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {aiRunning ? '생성 중...' : 'AI 리포트 생성'}
            </button>

            {/* More menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                ⋯
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPrompt((v) => !v);
                      setMenuOpen(false);
                    }}
                    className="px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer w-full text-left"
                  >
                    {showPrompt ? '프롬프트 숨기기' : '프롬프트 보기'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCopyPrompt();
                      setMenuOpen(false);
                    }}
                    className="px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer w-full text-left"
                  >
                    {copied ? '✓ 복사됨' : '프롬프트 복사'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDownloadJson();
                      setMenuOpen(false);
                    }}
                    disabled={filteredIssues.length === 0}
                    className="px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer w-full text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    이슈 데이터 다운로드 (.json)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Prompt preview */}
          {showPrompt && (
            <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto max-h-64 whitespace-pre-wrap leading-relaxed">
              {promptText}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
