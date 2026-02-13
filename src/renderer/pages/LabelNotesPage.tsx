import { useCallback, useEffect, useRef, useState } from 'react';
import Spinner from '../components/common/Spinner';
import { useJiraIssues } from '../hooks/useJiraIssues';
import { useLabelNotesPage } from '../hooks/useLabelNotesPage';

export default function LabelNotesPage() {
  const { data } = useJiraIssues();
  const {
    notes,
    isLoading,
    saveNote,
    deleteNote,
    newLabel,
    setNewLabel,
    jiraLabels,
    handleAdd,
    handleKeyDown,
  } = useLabelNotesPage(data?.issues);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900 mb-3">라벨 메모</h1>

        {/* 라벨 추가 */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="라벨명을 입력하세요"
            className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newLabel.trim() || notes.some((n) => n.label === newLabel.trim())}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            추가
          </button>
        </div>

        {/* Jira 라벨 중 메모 없는 것 빠른 추가 */}
        {jiraLabels.size > 0 && (() => {
          const unrecorded = [...jiraLabels].filter(
            (l) => !notes.some((n) => n.label === l),
          );
          if (unrecorded.length === 0) return null;
          return (
            <div className="mt-2 flex items-center gap-1 flex-wrap">
              <span className="text-xs text-gray-400 mr-1">Jira 라벨:</span>
              {unrecorded.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => saveNote(label, '')}
                  className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  + {label}
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      {/* 메모 건수 */}
      <div className="px-6 py-2 text-xs text-gray-400 border-b border-gray-100">
        {notes.length}개 라벨 메모
      </div>

      {/* 라벨 목록 */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {notes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-1">등록된 라벨 메모가 없습니다</p>
            <p className="text-sm">위에서 라벨을 추가해보세요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notes.map((note) => (
              <LabelNoteCard
                key={note.label}
                label={note.label}
                description={note.description}
                isJiraLabel={jiraLabels.has(note.label)}
                onSave={(desc) => saveNote(note.label, desc)}
                onDelete={() => deleteNote(note.label)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LabelNoteCard({
  label,
  description,
  isJiraLabel,
  onSave,
  onDelete,
}: {
  label: string;
  description: string;
  isJiraLabel: boolean;
  onSave: (desc: string) => void;
  onDelete: () => void;
}) {
  const [value, setValue] = useState(description);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 외부에서 description이 바뀌면 동기화
  useEffect(() => {
    setValue(description);
  }, [description]);

  const debouncedSave = useCallback(
    (text: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onSave(text);
      }, 500);
    },
    [onSave],
  );

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);
    debouncedSave(text);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-800">{label}</span>
          {isJiraLabel && (
            <span className="px-1.5 py-0.5 text-[10px] bg-green-50 text-green-600 rounded">
              Jira
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
        >
          삭제
        </button>
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="이 라벨의 의미나 용도를 기록하세요..."
        rows={2}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}
