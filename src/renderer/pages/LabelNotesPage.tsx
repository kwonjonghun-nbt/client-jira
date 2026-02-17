import Spinner from '../components/common/Spinner';
import LabelNoteCard from '../components/label-notes/LabelNoteCard';
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
