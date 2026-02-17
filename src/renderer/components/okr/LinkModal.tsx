import { useState, useMemo } from 'react';
import { statusBadgeClass } from '../../utils/issue';
import { XIcon } from '../common/Icons';
import type { NormalizedIssue } from '../../types/jira.types';

export interface LinkModalProps {
  existingIssueKeys: Set<string>;
  allIssues: NormalizedIssue[];
  onLinkJira: (issueKeys: string[]) => void;
  onCreateVirtual: (title: string, issueType: string, assignee: string) => void;
  onClose: () => void;
}

export default function LinkModal({
  existingIssueKeys,
  allIssues,
  onLinkJira,
  onCreateVirtual,
  onClose,
}: LinkModalProps) {
  const [activeTab, setActiveTab] = useState<'jira' | 'virtual'>('jira');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [vtTitle, setVtTitle] = useState('');
  const [vtType, setVtType] = useState('task');
  const [vtAssignee, setVtAssignee] = useState('');

  const filteredIssues = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allIssues
      .filter(
        (i) =>
          !existingIssueKeys.has(i.key) &&
          (i.key.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q)),
      )
      .slice(0, 20);
  }, [search, allIssues, existingIssueKeys]);

  const handleCreateVirtual = () => {
    if (!vtTitle.trim()) return;
    onCreateVirtual(vtTitle.trim(), vtType, vtAssignee.trim());
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">작업 연결</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <XIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('jira')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'jira'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Jira 이슈 연결
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('virtual')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'virtual'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            가상 티켓 생성
          </button>
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === 'jira' ? (
            <div>
              <input
                type="text"
                placeholder="이슈 키 또는 요약으로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <div className="mt-3 max-h-64 overflow-auto space-y-1">
                {search.trim() && filteredIssues.length === 0 && (
                  <p className="text-sm text-gray-500 py-2">검색 결과가 없습니다</p>
                )}
                {filteredIssues.map((issue) => {
                  const isSelected = selected.has(issue.key);
                  return (
                    <button
                      key={issue.key}
                      type="button"
                      onClick={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(issue.key)) next.delete(issue.key);
                          else next.add(issue.key);
                          return next;
                        })
                      }
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected ? 'bg-blue-50 ring-1 ring-blue-300' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className="text-xs font-mono text-blue-600 shrink-0">
                        {issue.key}
                      </span>
                      <span className="text-sm text-gray-800 truncate flex-1">
                        {issue.summary}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs rounded shrink-0 ${statusBadgeClass(issue.statusCategory)}`}
                      >
                        {issue.status}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selected.size > 0 && (
                <button
                  type="button"
                  onClick={() => onLinkJira([...selected])}
                  className="w-full mt-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  {selected.size}개 이슈 연결
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={vtTitle}
                  onChange={(e) => setVtTitle(e.target.value)}
                  placeholder="가상 티켓 제목"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateVirtual();
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이슈 타입
                </label>
                <select
                  value={vtType}
                  onChange={(e) => setVtType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="task">작업 (Task)</option>
                  <option value="story">스토리 (Story)</option>
                  <option value="epic">에픽 (Epic)</option>
                  <option value="bug">버그 (Bug)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  담당자
                </label>
                <input
                  type="text"
                  value={vtAssignee}
                  onChange={(e) => setVtAssignee(e.target.value)}
                  placeholder="(선택사항)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateVirtual}
                disabled={!vtTitle.trim()}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                생성 및 연결
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
