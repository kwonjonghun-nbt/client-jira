import { useMemo, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import Spinner from '../components/common/Spinner';
import { useOKR } from '../hooks/useOKR';
import { useJiraIssues } from '../hooks/useJiraIssues';
import { useUIStore } from '../store/uiStore';
import { useOKRActions } from '../hooks/useOKRActions';
import { calcKRProgress, calcObjectiveProgress, buildOKRExportData } from '../utils/okr';
import {
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  PlusIcon,
  LinkIcon,
  DownloadIcon,
} from '../components/common/Icons';
import LinkModal from '../components/okr/LinkModal';
import KRCanvasModal from '../components/okr/KRCanvasModal';
import { useAITaskStore } from '../store/aiTaskStore';
import type { NormalizedIssue } from '../types/jira.types';

export default function OKRPage() {
  const { data, isLoading, save } = useOKR();
  const jiraData = useJiraIssues();
  const openIssueDetail = useUIStore((s) => s.openIssueDetail);

  // ── Hooks composition ───────────────────────────────────────────────────
  const actions = useOKRActions(data, save);
  const { okr, updateOKR } = actions;

  // ── AI canvas navigation (from CanvasResultModal) ─────────────────────
  const openCanvasKRId = useAITaskStore((s) => s.openCanvasKRId);
  const setOpenCanvasKRId = useAITaskStore((s) => s.setOpenCanvasKRId);
  useEffect(() => {
    if (openCanvasKRId) {
      actions.setCanvasKRId(openCanvasKRId);
      setOpenCanvasKRId(null);
    }
  }, [openCanvasKRId, actions.setCanvasKRId, setOpenCanvasKRId]);

  // ── Derived data ────────────────────────────────────────────────────────
  const issueMap = useMemo(() => {
    const map = new Map<string, NormalizedIssue>();
    jiraData.data?.issues.forEach((i) => map.set(i.key, i));
    return map;
  }, [jiraData.data]);

  const baseUrl = jiraData.data?.source.baseUrl;
  const allIssues = jiraData.data?.issues ?? [];

  // ── Export handler ──────────────────────────────────────────────────────
  const handleExportOKR = useCallback(() => {
    const exportData = buildOKRExportData(okr, issueMap);
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `okr-export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [okr, issueMap]);

  // ── Loading state ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-auto px-6 relative">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-6 py-4 -mx-6 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">OKR 대시보드</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportOKR}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <DownloadIcon />
              내보내기
            </button>
            <button
              type="button"
              onClick={() => {
                actions.setAddingObjective(true);
                actions.setNewObjectiveTitle('');
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <PlusIcon />
              목표 추가
            </button>
          </div>
        </div>
      </div>

      {/* ── Add objective form ─────────────────────────────────────────── */}
      {actions.addingObjective && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">새 목표 추가</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={actions.newObjectiveTitle}
              onChange={(e) => actions.setNewObjectiveTitle(e.target.value)}
              placeholder="목표 제목을 입력하세요"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') actions.addObjective();
                if (e.key === 'Escape') actions.setAddingObjective(false);
              }}
            />
            <button
              type="button"
              onClick={actions.addObjective}
              disabled={!actions.newObjectiveTitle.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              추가
            </button>
            <button
              type="button"
              onClick={() => actions.setAddingObjective(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {okr.objectives.length === 0 && !actions.addingObjective && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <svg
            className="w-16 h-16 text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-base mb-4">아직 등록된 목표가 없습니다</p>
          <button
            type="button"
            onClick={() => {
              actions.setAddingObjective(true);
              actions.setNewObjectiveTitle('');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            첫 번째 목표 추가하기
          </button>
        </div>
      )}

      {/* ── Objective cards ────────────────────────────────────────────── */}
      <div className="space-y-4 pb-6">
        {okr.objectives
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((objective) => {
            const isCollapsed = actions.collapsedObjectives.has(objective.id);
            const objectiveKRs = okr.keyResults
              .filter((kr) => kr.objectiveId === objective.id)
              .sort((a, b) => a.order - b.order);
            const progress = calcObjectiveProgress(
              objective.id,
              okr.keyResults,
              okr.links,
              issueMap,
            );

            return (
              <div
                key={objective.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100"
              >
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
                      const krProgress = calcKRProgress(
                        kr.id,
                        okr.links,
                        issueMap,
                      );
                      const krLinks = okr.links
                        .filter((l) => l.keyResultId === kr.id)
                        .sort((a, b) => a.order - b.order);
                      const krGroups = okr.groups
                        .filter((g) => g.keyResultId === kr.id);

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
                              <span className="text-blue-500 ml-2">클릭하여 캔버스 열기 →</span>
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
          })}
      </div>

      {/* ── Link modal (main page) ─────────────────────────────────────── */}
      {actions.linkModalKRId && (
        <LinkModal
          existingIssueKeys={actions.getExistingIssueKeys(actions.linkModalKRId)}
          allIssues={allIssues}
          onLinkJira={(issueKeys) => actions.linkJiraIssues(actions.linkModalKRId!, issueKeys)}
          onCreateVirtual={(title, issueType, assignee) =>
            actions.createAndLinkVirtual(actions.linkModalKRId!, title, issueType, assignee)
          }
          onClose={() => actions.setLinkModalKRId(null)}
        />
      )}

      {/* ── KR Canvas Modal ────────────────────────────────────────────── */}
      {actions.canvasKRId && (() => {
        const kr = okr.keyResults.find((k) => k.id === actions.canvasKRId);
        if (!kr) return null;
        return (
          <KRCanvasModal
            kr={kr}
            okr={okr}
            issueMap={issueMap}
            allIssues={allIssues}
            baseUrl={baseUrl}
            onClose={() => actions.setCanvasKRId(null)}
            updateOKR={updateOKR}
            openIssueDetail={openIssueDetail}
          />
        );
      })()}
    </div>
  );
}
