import { calcKRProgress } from '../../utils/okr';
import {
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  PlusIcon,
  LinkIcon,
} from '../common/Icons';
import type { OKRData, OKRKeyResult, OKRObjective, NormalizedIssue } from '../../types/jira.types';

interface ObjectiveCardProps {
  objective: OKRObjective;
  isCollapsed: boolean;
  progress: number;
  objectiveKRs: OKRKeyResult[];
  okr: OKRData;
  issueMap: Map<string, NormalizedIssue>;
  actions: {
    toggleCollapse: (id: string) => void;
    editingId: string | null;
    editingValue: string;
    setEditingValue: (v: string) => void;
    setEditingId: (id: string | null) => void;
    startEditing: (id: string, title: string) => void;
    saveEditing: () => void;
    deleteObjective: (id: string) => void;
    deleteKeyResult: (id: string) => void;
    setLinkModalKRId: (id: string | null) => void;
    setCanvasKRId: (id: string | null) => void;
    addingKRForObjective: string | null;
    setAddingKRForObjective: (id: string | null) => void;
    newKRTitle: string;
    setNewKRTitle: (v: string) => void;
    addKeyResult: (objectiveId: string) => void;
  };
}

export default function ObjectiveCard({
  objective,
  isCollapsed,
  progress,
  objectiveKRs,
  okr,
  issueMap,
  actions,
}: ObjectiveCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* ── Objective header ──────────────────────────────── */}
      <div className="p-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => actions.toggleCollapse(objective.id)}
            className="p-0.5 text-gray-400 hover:text-gray-600 rounded shrink-0"
          >
            <ChevronDownIcon open={!isCollapsed} />
          </button>

          <div className="flex-1 min-w-0">
            {actions.editingId === objective.id ? (
              <input
                type="text"
                value={actions.editingValue}
                onChange={(e) => actions.setEditingValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') actions.saveEditing();
                  if (e.key === 'Escape') actions.setEditingId(null);
                }}
                onBlur={actions.saveEditing}
                className="w-full px-2 py-1 border border-blue-300 rounded text-base font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <h2
                className="text-base font-semibold text-gray-800 cursor-pointer"
                onDoubleClick={() =>
                  actions.startEditing(objective.id, objective.title)
                }
              >
                {objective.title}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() =>
                actions.startEditing(objective.id, objective.title)
              }
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
              title="수정"
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              onClick={() => actions.deleteObjective(objective.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
              title="삭제"
            >
              <TrashIcon />
            </button>
          </div>
        </div>

        {/* Objective progress bar */}
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs text-gray-500 shrink-0">진행률</span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 rounded-full h-2 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-700 shrink-0 w-8 text-right">
            {progress}%
          </span>
        </div>
      </div>

      {/* ── Collapsible KR content ───────────────────────── */}
      {!isCollapsed && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-3 bg-gray-100/70">
          {objectiveKRs.length === 0 && (
            <p className="text-sm text-gray-400 py-4">
              아직 등록된 KR이 없습니다
            </p>
          )}

          {objectiveKRs.map((kr) => {
            const krProgress = calcKRProgress(kr.id, okr.links, issueMap);
            const krLinks = okr.links
              .filter((l) => l.keyResultId === kr.id)
              .sort((a, b) => a.order - b.order);
            const krGroups = okr.groups.filter(
              (g) => g.keyResultId === kr.id,
            );

            return (
              <div
                key={kr.id}
                className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm"
              >
                {/* KR header */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    {actions.editingId === kr.id ? (
                      <input
                        type="text"
                        value={actions.editingValue}
                        onChange={(e) =>
                          actions.setEditingValue(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') actions.saveEditing();
                          if (e.key === 'Escape')
                            actions.setEditingId(null);
                        }}
                        onBlur={actions.saveEditing}
                        className="w-full px-2 py-1 border border-blue-300 rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <h3
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                        onDoubleClick={() =>
                          actions.startEditing(kr.id, kr.title)
                        }
                      >
                        {kr.title}
                      </h3>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        actions.startEditing(kr.id, kr.title)
                      }
                      className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                      title="수정"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => actions.deleteKeyResult(kr.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      title="삭제"
                    >
                      <TrashIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => actions.setLinkModalKRId(kr.id)}
                      className="flex items-center gap-1 ml-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <LinkIcon />
                      작업 연결
                    </button>
                  </div>
                </div>

                {/* KR progress bar */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-gray-500 shrink-0">
                    진행률
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`rounded-full h-2 transition-all ${
                        krProgress === 100
                          ? 'bg-green-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${krProgress}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 shrink-0 w-8 text-right">
                    {krProgress}%
                  </span>
                </div>

                {/* KR summary (clickable to open canvas modal) */}
                <div
                  onClick={() => actions.setCanvasKRId(kr.id)}
                  className="mt-3 p-4 border border-dashed border-gray-200 rounded-lg bg-gray-50/30 cursor-pointer hover:bg-gray-100/50 transition-colors"
                >
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <span>작업 {krLinks.length}개</span>
                    {krGroups.length > 0 && (
                      <>
                        <span>·</span>
                        <span>그룹 {krGroups.length}개</span>
                      </>
                    )}
                    <span className="text-blue-500 ml-2">
                      클릭하여 캔버스 열기 →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add KR form / button */}
          {actions.addingKRForObjective === objective.id ? (
            <div className="pt-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={actions.newKRTitle}
                  onChange={(e) => actions.setNewKRTitle(e.target.value)}
                  placeholder="KR 제목을 입력하세요"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')
                      actions.addKeyResult(objective.id);
                    if (e.key === 'Escape')
                      actions.setAddingKRForObjective(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => actions.addKeyResult(objective.id)}
                  disabled={!actions.newKRTitle.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => actions.setAddingKRForObjective(null)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                actions.setAddingKRForObjective(objective.id);
                actions.setNewKRTitle('');
              }}
              className="flex items-center gap-1.5 mt-4 px-3 py-1.5 text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <PlusIcon />
              KR 추가
            </button>
          )}
        </div>
      )}
    </div>
  );
}
