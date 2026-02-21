import { useMemo, useCallback, useEffect } from 'react';
import Spinner from '../components/common/Spinner';
import { useOKR } from '../hooks/useOKR';
import { useJiraIssues } from '../hooks/useJiraIssues';
import { useUIStore } from '../store/uiStore';
import { useOKRActions } from '../hooks/useOKRActions';
import { calcObjectiveProgress, buildOKRExportData } from '../utils/okr';
import { PlusIcon, DownloadIcon } from '../components/common/Icons';
import LinkModal from '../components/okr/LinkModal';
import KRCanvasModal from '../components/okr/KRCanvasModal';
import ObjectiveCard from '../components/okr/ObjectiveCard';
import AddObjectiveForm from '../components/okr/AddObjectiveForm';
import OKREmptyState from '../components/okr/OKREmptyState';
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

  const objectiveProgressMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const obj of okr.objectives) {
      map.set(obj.id, calcObjectiveProgress(obj.id, okr.keyResults, okr.links, issueMap));
    }
    return map;
  }, [okr.objectives, okr.keyResults, okr.links, issueMap]);

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
        <AddObjectiveForm
          title={actions.newObjectiveTitle}
          onTitleChange={actions.setNewObjectiveTitle}
          onSubmit={actions.addObjective}
          onCancel={() => actions.setAddingObjective(false)}
        />
      )}

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {okr.objectives.length === 0 && !actions.addingObjective && (
        <OKREmptyState
          onAddObjective={() => {
            actions.setAddingObjective(true);
            actions.setNewObjectiveTitle('');
          }}
        />
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
            const progress = objectiveProgressMap.get(objective.id) ?? 0;

            return (
              <ObjectiveCard
                key={objective.id}
                objective={objective}
                isCollapsed={isCollapsed}
                progress={progress}
                objectiveKRs={objectiveKRs}
                okr={okr}
                issueMap={issueMap}
                actions={actions}
              />
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
