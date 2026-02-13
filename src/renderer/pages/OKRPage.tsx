import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Spinner from '../components/common/Spinner';
import { useOKR } from '../hooks/useOKR';
import { useJiraIssues } from '../hooks/useJiraIssues';
import { useUIStore } from '../store/uiStore';
import { statusBadgeClass } from '../utils/issue';
import type {
  OKRData,
  OKRKeyResult,
  OKRLink,
  NormalizedIssue,
} from '../types/jira.types';
import { useCanvasTransform } from '../hooks/okr/useCanvasTransform';
import { useCanvasDrag } from '../hooks/okr/useCanvasDrag';
import { useCanvasRelations } from '../hooks/okr/useCanvasRelations';
import { useTicketActions } from '../hooks/okr/useTicketActions';
import { useGroupActions } from '../hooks/okr/useGroupActions';
import { useWaypointDrag } from '../hooks/okr/useWaypointDrag';
import { findBestInsertIndex } from '../utils/anchor-points';
import JiraCard from '../components/okr/JiraCard';
import VirtualCard from '../components/okr/VirtualCard';
import GroupContainer from '../components/okr/GroupContainer';
import {
  CARD_W,
  CARD_H,
  MIN_ZOOM,
  MAX_ZOOM,
  assignDefaultPosition,
  type Rect,
} from '../hooks/okr/okr-canvas.types';

// ─── Empty OKR data ───────────────────────────────────────────────────────────

const emptyOKR: OKRData = {
  objectives: [],
  keyResults: [],
  virtualTickets: [],
  links: [],
  groups: [],
  relations: [],
  updatedAt: new Date().toISOString(),
};

// ─── Progress helpers ─────────────────────────────────────────────────────────

function calcKRProgress(
  krId: string,
  links: OKRLink[],
  issueMap: Map<string, NormalizedIssue>,
): number {
  const krLinks = links.filter((l) => l.keyResultId === krId && l.type === 'jira');
  if (krLinks.length === 0) return 0;
  const doneCount = krLinks.filter((l) => {
    const issue = issueMap.get(l.issueKey!);
    return issue?.statusCategory === 'done';
  }).length;
  return Math.round((doneCount / krLinks.length) * 100);
}

function calcObjectiveProgress(
  objectiveId: string,
  keyResults: OKRKeyResult[],
  links: OKRLink[],
  issueMap: Map<string, NormalizedIssue>,
): number {
  const krs = keyResults.filter((kr) => kr.objectiveId === objectiveId);
  if (krs.length === 0) return 0;
  const total = krs.reduce(
    (sum, kr) => sum + calcKRProgress(kr.id, links, issueMap),
    0,
  );
  return Math.round(total / krs.length);
}

// ─── SVG Icon components ──────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-5 h-5 transition-transform ${open ? '' : '-rotate-90'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

// ─── Link Modal ───────────────────────────────────────────────────────────────

interface LinkModalProps {
  existingIssueKeys: Set<string>;
  allIssues: NormalizedIssue[];
  onLinkJira: (issueKeys: string[]) => void;
  onCreateVirtual: (title: string, issueType: string, assignee: string) => void;
  onClose: () => void;
}

function LinkModal({
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

// ─── KR Canvas Modal ──────────────────────────────────────────────────────────

interface KRCanvasModalProps {
  kr: OKRKeyResult;
  okr: OKRData;
  issueMap: Map<string, NormalizedIssue>;
  allIssues: NormalizedIssue[];
  baseUrl?: string;
  onClose: () => void;
  updateOKR: (updater: (draft: OKRData) => OKRData) => void;
  openIssueDetail: (issue: NormalizedIssue, baseUrl?: string) => void;
}

function KRCanvasModal({
  kr,
  okr,
  issueMap,
  allIssues,
  baseUrl,
  onClose,
  updateOKR,
  openIssueDetail,
}: KRCanvasModalProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const groupsRef = useRef<import('../types/jira.types').OKRGroup[]>([]);

  // ── Hooks composition ─────────────────────────────────────────────────
  const relations = useCanvasRelations(okr, kr.id, zoomRef, updateOKR, canvasRef);
  const transform = useCanvasTransform(viewportRef, relations.connectMode);
  const drag = useCanvasDrag(transform.zoom, updateOKR, relations.recalcArrows, relations.connectMode, groupsRef);
  const tickets = useTicketActions(kr.id, updateOKR);
  const groups = useGroupActions(kr.id, updateOKR);
  const waypointDrag = useWaypointDrag(transform.zoom, canvasRef, relations.moveWaypoint);

  // Keep zoomRef in sync so recalcArrows always reads the latest zoom
  zoomRef.current = transform.zoom;

  // Recalculate arrows after DOM paints new positions (zoom/pan/data changes)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      relations.recalcArrows();
    });
    return () => cancelAnimationFrame(id);
  }, [transform.zoom, transform.pan, okr.links, okr.groups]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Local UI state ────────────────────────────────────────────────────
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingVTId, setEditingVTId] = useState<string | null>(null);
  const [editingVTTitle, setEditingVTTitle] = useState('');

  // ── Derived data ──────────────────────────────────────────────────────
  const krLinks = useMemo(
    () => okr.links.filter((l) => l.keyResultId === kr.id).sort((a, b) => a.order - b.order),
    [okr.links, kr.id],
  );
  const allKRGroups = useMemo(
    () => okr.groups.filter((g) => g.keyResultId === kr.id).sort((a, b) => a.order - b.order),
    [okr.groups, kr.id],
  );
  const krGroups = useMemo(
    () => allKRGroups.filter((g) => !g.parentGroupId),
    [allKRGroups],
  );
  groupsRef.current = allKRGroups;
  const ungroupedLinks = useMemo(() => krLinks.filter((l) => !l.groupId), [krLinks]);
  const krProgress = calcKRProgress(kr.id, okr.links, issueMap);
  const existingIssueKeys = useMemo(
    () => new Set(krLinks.filter((l) => l.type === 'jira' && l.issueKey).map((l) => l.issueKey!)),
    [krLinks],
  );

  // ── VT editing ────────────────────────────────────────────────────────
  const saveVTEditing = useCallback(() => {
    if (!editingVTId || !editingVTTitle.trim()) {
      setEditingVTId(null);
      return;
    }
    const trimmed = editingVTTitle.trim();
    updateOKR((d) => ({
      ...d,
      virtualTickets: d.virtualTickets.map((vt) =>
        vt.id === editingVTId ? { ...vt, title: trimmed } : vt,
      ),
    }));
    setEditingVTId(null);
  }, [editingVTId, editingVTTitle, updateOKR]);

  // ── Link modal handlers ───────────────────────────────────────────────
  const handleLinkJira = useCallback((issueKeys: string[]) => {
    tickets.linkJiraIssues(issueKeys);
    setLinkModalOpen(false);
  }, [tickets]);

  const handleCreateVirtual = useCallback((title: string, issueType: string, assignee: string) => {
    tickets.createAndLinkVirtual(title, issueType, assignee);
    setLinkModalOpen(false);
  }, [tickets]);

  // ── ESC to close (skip if a higher modal is open) ───────────────────
  const selectedIssue = useUIStore((s) => s.selectedIssue);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (linkModalOpen) return;
        if (selectedIssue) return; // issue detail modal handles its own ESC
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, linkModalOpen, selectedIssue]);

  // ── Fit to view ───────────────────────────────────────────────────────
  const handleFitToView = useCallback(() => {
    const allItems = [
      ...ungroupedLinks.map((l) => ({ x: l.x ?? 0, y: l.y ?? 0, w: CARD_W, h: CARD_H })),
      ...krGroups.map((g) => ({ x: g.x ?? 0, y: g.y ?? 0, w: g.w ?? 320, h: g.h ?? 200 })),
    ];
    transform.fitToView(allItems);
  }, [ungroupedLinks, krGroups, transform]);

  // ── Render card ───────────────────────────────────────────────────────
  const renderCard = useCallback((link: OKRLink) => {
    if (link.type === 'jira' && link.issueKey) {
      const issue = issueMap.get(link.issueKey);
      return (
        <JiraCard
          link={link}
          issue={issue}
          isDragging={drag.dragInfo?.id === link.id}
          connectMode={relations.connectMode}
          connectFrom={relations.connectFrom}
          onAnchorClick={relations.handleAnchorClick}
          onCardClick={() => {
            if (drag.wasDraggingRef.current) return;
            if (!relations.connectMode && issue) {
              openIssueDetail(issue, baseUrl);
            }
          }}
          onUnlink={() => tickets.unlinkWork(link.id)}
          setRef={(el) => relations.setElementRef('link', link.id, el)}
        />
      );
    }

    if (link.type === 'virtual' && link.virtualTicketId) {
      const vt = okr.virtualTickets.find((v) => v.id === link.virtualTicketId);
      if (!vt) return null;
      return (
        <VirtualCard
          link={link}
          vt={vt}
          isDragging={drag.dragInfo?.id === link.id}
          connectMode={relations.connectMode}
          connectFrom={relations.connectFrom}
          isEditing={editingVTId === vt.id}
          editingTitle={editingVTTitle}
          onAnchorClick={relations.handleAnchorClick}
          onCardClick={() => {}}
          onUnlink={() => tickets.unlinkWork(link.id)}
          onDelete={() => tickets.deleteVirtualTicket(vt.id)}
          onStartEdit={() => { setEditingVTId(vt.id); setEditingVTTitle(vt.title); }}
          onChangeTitle={setEditingVTTitle}
          onSaveEdit={saveVTEditing}
          onCancelEdit={() => setEditingVTId(null)}
          setRef={(el) => relations.setElementRef('link', link.id, el)}
        />
      );
    }

    return null;
  }, [issueMap, drag.dragInfo, relations, tickets, openIssueDetail, baseUrl, editingVTId, editingVTTitle, saveVTEditing, okr.virtualTickets]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black/40">
      <div className="absolute inset-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 shrink-0">
          <h3 className="text-base font-semibold text-gray-800 truncate flex-1">{kr.title}</h3>

          {/* Progress */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div
                className={`rounded-full h-2 transition-all ${krProgress === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                style={{ width: `${krProgress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600 w-8">{krProgress}%</span>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 border-l border-gray-200 pl-3 ml-2">
            <button
              type="button"
              onClick={() => transform.setZoom((z) => Math.max(MIN_ZOOM, z - 0.1))}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
            >
              -
            </button>
            <span className="text-xs text-gray-600 w-10 text-center">{Math.round(transform.zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => transform.setZoom((z) => Math.min(MAX_ZOOM, z + 0.1))}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleFitToView}
              className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
              title="맞춤"
            >
              맞춤
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 border-l border-gray-200 pl-3 ml-2">
            <button
              type="button"
              onClick={() => setLinkModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <LinkIcon />
              작업 연결
            </button>
            <button
              type="button"
              onClick={relations.toggleConnectMode}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg ${
                relations.connectMode
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <ArrowRightIcon />
              {relations.connectMode ? '연결 종료' : '관계 연결'}
            </button>
            <button
              type="button"
              onClick={() => { groups.setAddingGroup(true); groups.setNewGroupTitle(''); }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <PlusIcon />
              그룹
            </button>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 ml-2"
          >
            <XIcon />
          </button>
        </div>

        {/* Connect mode indicator */}
        {relations.connectMode && (
          <div className="px-5 py-1.5 bg-indigo-50 text-sm text-indigo-600 font-medium shrink-0">
            {relations.connectFrom ? '도착 요소의 앵커 포인트를 클릭하세요' : '시작 요소의 앵커 포인트를 클릭하세요'}
          </div>
        )}

        {/* Group add form */}
        {groups.addingGroup && (
          <div className="flex gap-2 items-center px-5 py-2 bg-gray-50 border-b border-gray-200 shrink-0">
            <input
              type="text"
              value={groups.newGroupTitle}
              onChange={(e) => groups.setNewGroupTitle(e.target.value)}
              placeholder="그룹 이름"
              className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') groups.handleAddGroup();
                if (e.key === 'Escape') groups.setAddingGroup(false);
              }}
            />
            <button
              type="button"
              onClick={() => groups.handleAddGroup()}
              disabled={!groups.newGroupTitle.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              추가
            </button>
            <button
              type="button"
              onClick={() => groups.setAddingGroup(false)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              취소
            </button>
          </div>
        )}

        {/* Canvas viewport */}
        <div
          ref={viewportRef}
          className="flex-1 overflow-hidden relative bg-gray-50 cursor-grab"
          onMouseDown={transform.handlePanMouseDown}
        >
          <div
            ref={canvasRef}
            style={{
              transform: `scale(${transform.zoom}) translate(${transform.pan.x}px, ${transform.pan.y}px)`,
              transformOrigin: '0 0',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '10000px',
              height: '10000px',
            }}
          >
            {/* Ungrouped cards */}
            {ungroupedLinks.map((link) => (
              <div
                key={link.id}
                data-canvas-item
                style={{
                  position: 'absolute',
                  left: `${drag.dragInfo?.id === link.id ? drag.dragInfo.currentX : (link.x ?? 0)}px`,
                  top: `${drag.dragInfo?.id === link.id ? drag.dragInfo.currentY : (link.y ?? 0)}px`,
                  width: `${CARD_W}px`,
                  zIndex: drag.dragInfo?.id === link.id ? 50 : 1,
                }}
                className={drag.dragInfo?.id === link.id ? 'cursor-grabbing' : 'cursor-grab'}
                onMouseDown={(e) => drag.startDrag(e, 'card', link.id, link.x ?? 0, link.y ?? 0)}
              >
                {renderCard(link)}
              </div>
            ))}

            {/* Groups */}
            {krGroups.map((group) => {
              const groupLinks = krLinks.filter((l) => l.groupId === group.id);
              const childGroups = allKRGroups.filter((g) => g.parentGroupId === group.id);
              return (
                <GroupContainer
                  key={group.id}
                  group={group}
                  groupLinks={groupLinks}
                  childGroups={childGroups}
                  allLinks={krLinks}
                  allGroups={allKRGroups}
                  depth={1}
                  isDragging={drag.dragInfo?.id === group.id}
                  zoom={transform.zoom}
                  dragInfo={drag.dragInfo}
                  connectMode={relations.connectMode}
                  connectFrom={relations.connectFrom}
                  onAnchorClick={relations.handleAnchorClick}
                  setGroupRef={(groupId, el) => relations.setElementRef('group', groupId, el)}
                  editingGroupId={groups.editingGroupId}
                  editingGroupTitle={groups.editingGroupTitle}
                  addingSubgroupForId={groups.addingSubgroupForId}
                  newGroupTitle={groups.newGroupTitle}
                  onMouseDown={(e) => drag.startDrag(e, 'group', group.id, group.x ?? 0, group.y ?? 0)}
                  onResizeGroup={(groupId: string, w: number, h: number) => {
                    updateOKR((d) => ({
                      ...d,
                      groups: d.groups.map((g) => g.id === groupId ? { ...g, w, h } : g),
                    }));
                  }}
                  onStartEditGroup={(groupId: string, title: string) => { groups.setEditingGroupId(groupId); groups.setEditingGroupTitle(title); }}
                  onChangeTitle={groups.setEditingGroupTitle}
                  onSaveEdit={groups.renameGroup}
                  onCancelEdit={() => groups.setEditingGroupId(null)}
                  onDeleteGroup={(groupId: string) => groups.deleteGroup(groupId)}
                  onStartAddSubgroup={(groupId: string) => { groups.setAddingSubgroupForId(groupId); groups.setNewGroupTitle(''); }}
                  onNewGroupTitleChange={groups.setNewGroupTitle}
                  onConfirmAddSubgroup={(parentGroupId: string) => groups.handleAddGroup(parentGroupId)}
                  onCancelAddSubgroup={() => groups.setAddingSubgroupForId(null)}
                  renderCard={renderCard}
                  startDrag={(e, linkId: string, x: number, y: number, parentGroupId?: string) => drag.startDrag(e, 'card', linkId, x, y, parentGroupId ?? group.id)}
                  startGroupDrag={(e, groupId: string, x: number, y: number, parentGroupId?: string) => drag.startDrag(e, 'group', groupId, x, y, parentGroupId)}
                />
              );
            })}

            {/* Arrow SVG inside canvas transform */}
            {relations.arrows.length > 0 && (
              <svg className="absolute inset-0 pointer-events-none" style={{ width: '10000px', height: '10000px', zIndex: 10 }}>
                <defs>
                  <marker id="canvas-arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
                  </marker>
                </defs>
                {relations.arrows.map((arrow) => {
                  const mx = (arrow.x1 + arrow.x2) / 2;
                  const my = (arrow.y1 + arrow.y2) / 2;
                  return (
                    <g key={arrow.id}>
                      {/* Visible arrow path */}
                      <path
                        d={arrow.path}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2"
                        strokeDasharray="6 3"
                        markerEnd="url(#canvas-arrowhead)"
                      />

                      {/* Invisible wider hit area for double-click to add waypoint */}
                      <path
                        d={arrow.path}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="16"
                        className="pointer-events-auto cursor-pointer"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          const canvasEl = canvasRef.current;
                          if (!canvasEl) return;
                          const rect = canvasEl.getBoundingClientRect();
                          const scaleInv = 1 / transform.zoom;
                          const pos = {
                            x: (e.clientX - rect.left) * scaleInv,
                            y: (e.clientY - rect.top) * scaleInv,
                          };
                          const insertIdx = findBestInsertIndex(pos, arrow.waypoints);
                          relations.addWaypoint(arrow.relationId, pos, insertIdx);
                        }}
                      />

                      {/* Manual waypoint dots (draggable, double-click to remove) */}
                      {arrow.hasManualWaypoints && arrow.waypoints.slice(1, -1).map((wp, i) => (
                        <circle
                          key={`wp-${arrow.id}-${i}`}
                          cx={wp.x}
                          cy={wp.y}
                          r="5"
                          fill="white"
                          stroke="#6366f1"
                          strokeWidth="2"
                          className="pointer-events-auto cursor-move"
                          onMouseDown={(e) => waypointDrag.startWaypointDrag(e, arrow.relationId, i)}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            relations.removeWaypoint(arrow.relationId, i);
                          }}
                        />
                      ))}

                      {/* Delete button at midpoint (shown in connect mode) */}
                      {relations.connectMode && (
                        <g
                          className="cursor-pointer pointer-events-auto"
                          onClick={() => relations.deleteRelation(arrow.relationId)}
                        >
                          <circle cx={mx} cy={my} r="8" fill="white" stroke="#6366f1" strokeWidth="1.5" />
                          <path
                            d={`M ${mx - 3} ${my - 3} L ${mx + 3} ${my + 3} M ${mx + 3} ${my - 3} L ${mx - 3} ${my + 3}`}
                            stroke="#ef4444"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Empty state */}
            {ungroupedLinks.length === 0 && krGroups.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ width: '100%', height: '100%' }}>
                <p className="text-sm text-gray-400">작업을 연결하세요</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Link modal (rendered inside the canvas modal, higher z-index) */}
      {linkModalOpen && (
        <LinkModal
          existingIssueKeys={existingIssueKeys}
          allIssues={allIssues}
          onLinkJira={handleLinkJira}
          onCreateVirtual={handleCreateVirtual}
          onClose={() => setLinkModalOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Main OKR Page ────────────────────────────────────────────────────────────

export default function OKRPage() {
  const { data, isLoading, save } = useOKR();
  const jiraData = useJiraIssues();
  const openIssueDetail = useUIStore((s) => s.openIssueDetail);

  // ── Derived data ──────────────────────────────────────────────────────────

  const okr = data ?? emptyOKR;

  const issueMap = useMemo(() => {
    const map = new Map<string, NormalizedIssue>();
    jiraData.data?.issues.forEach((i) => map.set(i.key, i));
    return map;
  }, [jiraData.data]);

  const baseUrl = jiraData.data?.source.baseUrl;
  const allIssues = jiraData.data?.issues ?? [];

  // ── Local UI state ────────────────────────────────────────────────────────

  const [collapsedObjectives, setCollapsedObjectives] = useState<Set<string>>(
    new Set(),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [addingObjective, setAddingObjective] = useState(false);
  const [newObjectiveTitle, setNewObjectiveTitle] = useState('');
  const [addingKRForObjective, setAddingKRForObjective] = useState<string | null>(null);
  const [newKRTitle, setNewKRTitle] = useState('');
  const [linkModalKRId, setLinkModalKRId] = useState<string | null>(null);
  const [canvasKRId, setCanvasKRId] = useState<string | null>(null);

  // ── OKR update helper ─────────────────────────────────────────────────────

  const updateOKR = useCallback(
    (updater: (draft: OKRData) => OKRData) => {
      const current = data ?? emptyOKR;
      const updated = updater({ ...current });
      updated.updatedAt = new Date().toISOString();
      save(updated);
    },
    [data, save],
  );

  // ── CRUD: Objectives ──────────────────────────────────────────────────────

  const addObjective = () => {
    const title = newObjectiveTitle.trim();
    if (!title) return;
    updateOKR((d) => ({
      ...d,
      objectives: [
        ...d.objectives,
        { id: crypto.randomUUID(), title, order: d.objectives.length },
      ],
    }));
    setNewObjectiveTitle('');
    setAddingObjective(false);
  };

  const deleteObjective = (objectiveId: string) => {
    if (!window.confirm('이 목표와 하위 KR, 연결된 작업을 모두 삭제하시겠습니까?')) return;
    updateOKR((d) => {
      const krIds = new Set(
        d.keyResults.filter((kr) => kr.objectiveId === objectiveId).map((kr) => kr.id),
      );
      const remainingLinks = d.links.filter((l) => !krIds.has(l.keyResultId));
      const linkedVTIds = new Set(
        remainingLinks.filter((l) => l.type === 'virtual').map((l) => l.virtualTicketId),
      );
      const removedLinkIds = new Set(
        d.links.filter((l) => krIds.has(l.keyResultId)).map((l) => l.id),
      );
      return {
        ...d,
        objectives: d.objectives.filter((o) => o.id !== objectiveId),
        keyResults: d.keyResults.filter((kr) => kr.objectiveId !== objectiveId),
        links: remainingLinks,
        groups: d.groups.filter((g) => !krIds.has(g.keyResultId)),
        virtualTickets: d.virtualTickets.filter(
          (vt) => linkedVTIds.has(vt.id),
        ),
        relations: d.relations.filter(
          (r) => !(r.fromType === 'link' && removedLinkIds.has(r.fromId)) &&
                 !(r.toType === 'link' && removedLinkIds.has(r.toId)),
        ),
      };
    });
  };

  // ── CRUD: Key Results ─────────────────────────────────────────────────────

  const addKeyResult = (objectiveId: string) => {
    const title = newKRTitle.trim();
    if (!title) return;
    updateOKR((d) => ({
      ...d,
      keyResults: [
        ...d.keyResults,
        {
          id: crypto.randomUUID(),
          objectiveId,
          title,
          order: d.keyResults.filter((kr) => kr.objectiveId === objectiveId).length,
        },
      ],
    }));
    setNewKRTitle('');
    setAddingKRForObjective(null);
  };

  const deleteKeyResult = (krId: string) => {
    if (!window.confirm('이 KR과 연결된 작업을 모두 삭제하시겠습니까?')) return;
    updateOKR((d) => {
      const removedLinkIds = new Set(
        d.links.filter((l) => l.keyResultId === krId).map((l) => l.id),
      );
      const remainingLinks = d.links.filter((l) => l.keyResultId !== krId);
      const linkedVTIds = new Set(
        remainingLinks.filter((l) => l.type === 'virtual').map((l) => l.virtualTicketId),
      );
      return {
        ...d,
        keyResults: d.keyResults.filter((kr) => kr.id !== krId),
        links: remainingLinks,
        groups: d.groups.filter((g) => g.keyResultId !== krId),
        virtualTickets: d.virtualTickets.filter(
          (vt) => linkedVTIds.has(vt.id),
        ),
        relations: d.relations.filter(
          (r) => !(r.fromType === 'link' && removedLinkIds.has(r.fromId)) &&
                 !(r.toType === 'link' && removedLinkIds.has(r.toId)),
        ),
      };
    });
  };

  // ── CRUD: Links (for main page link modal) ─────────────────────────────

  const linkJiraIssues = (keyResultId: string, issueKeys: string[]) => {
    if (issueKeys.length === 0) return;
    updateOKR((d) => {
      const krLinks = d.links.filter((l) => l.keyResultId === keyResultId);
      const krGrps = d.groups.filter((g) => g.keyResultId === keyResultId);
      const occupied: Rect[] = [
        ...krLinks.map((l) => ({ x: l.x ?? 0, y: l.y ?? 0, w: CARD_W, h: CARD_H })),
        ...krGrps.map((g) => ({ x: g.x ?? 0, y: g.y ?? 0, w: g.w ?? 300, h: g.h ?? 200 })),
      ];
      const newLinks = issueKeys.map((issueKey, i) => {
        const pos = assignDefaultPosition(occupied, CARD_W, CARD_H, 800);
        occupied.push({ x: pos.x, y: pos.y, w: CARD_W, h: CARD_H });
        return {
          id: crypto.randomUUID(),
          keyResultId,
          type: 'jira' as const,
          issueKey,
          order: krLinks.length + i,
          x: pos.x,
          y: pos.y,
        };
      });
      return { ...d, links: [...d.links, ...newLinks] };
    });
    setLinkModalKRId(null);
  };

  const createAndLinkVirtual = (
    keyResultId: string,
    title: string,
    issueType: string,
    assignee: string,
  ) => {
    const vtId = crypto.randomUUID();
    updateOKR((d) => {
      const krLinks = d.links.filter((l) => l.keyResultId === keyResultId);
      const krGrps = d.groups.filter((g) => g.keyResultId === keyResultId);
      const occupied: Rect[] = [
        ...krLinks.map((l) => ({ x: l.x ?? 0, y: l.y ?? 0, w: CARD_W, h: CARD_H })),
        ...krGrps.map((g) => ({ x: g.x ?? 0, y: g.y ?? 0, w: g.w ?? 300, h: g.h ?? 200 })),
      ];
      const pos = assignDefaultPosition(occupied, CARD_W, CARD_H, 800);
      return {
        ...d,
        virtualTickets: [
          ...d.virtualTickets,
          {
            id: vtId,
            title,
            issueType,
            assignee: assignee || undefined,
            createdAt: new Date().toISOString(),
          },
        ],
        links: [
          ...d.links,
          {
            id: crypto.randomUUID(),
            keyResultId,
            type: 'virtual' as const,
            virtualTicketId: vtId,
            order: krLinks.length,
            x: pos.x,
            y: pos.y,
          },
        ],
      };
    });
    setLinkModalKRId(null);
  };

  // ── Inline editing ────────────────────────────────────────────────────────

  const startEditing = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingValue(currentTitle);
  };

  const saveEditing = () => {
    if (!editingId || !editingValue.trim()) {
      setEditingId(null);
      return;
    }
    const trimmed = editingValue.trim();
    updateOKR((d) => ({
      ...d,
      objectives: d.objectives.map((o) =>
        o.id === editingId ? { ...o, title: trimmed } : o,
      ),
      keyResults: d.keyResults.map((kr) =>
        kr.id === editingId ? { ...kr, title: trimmed } : kr,
      ),
    }));
    setEditingId(null);
  };

  // ── Collapse toggle ───────────────────────────────────────────────────────

  const toggleCollapse = (objectiveId: string) => {
    setCollapsedObjectives((prev) => {
      const next = new Set(prev);
      if (next.has(objectiveId)) {
        next.delete(objectiveId);
      } else {
        next.add(objectiveId);
      }
      return next;
    });
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── Existing issue keys for a given KR (for de-duplication in modal) ──────

  const getExistingIssueKeys = (krId: string): Set<string> => {
    return new Set(
      okr.links
        .filter((l) => l.keyResultId === krId && l.type === 'jira' && l.issueKey)
        .map((l) => l.issueKey!),
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-auto px-6 relative">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-6 py-4 -mx-6 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">OKR 대시보드</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAddingObjective(true);
                setNewObjectiveTitle('');
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
      {addingObjective && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">새 목표 추가</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newObjectiveTitle}
              onChange={(e) => setNewObjectiveTitle(e.target.value)}
              placeholder="목표 제목을 입력하세요"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') addObjective();
                if (e.key === 'Escape') setAddingObjective(false);
              }}
            />
            <button
              type="button"
              onClick={addObjective}
              disabled={!newObjectiveTitle.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              추가
            </button>
            <button
              type="button"
              onClick={() => setAddingObjective(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {okr.objectives.length === 0 && !addingObjective && (
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
              setAddingObjective(true);
              setNewObjectiveTitle('');
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
            const isCollapsed = collapsedObjectives.has(objective.id);
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
                      onClick={() => toggleCollapse(objective.id)}
                      className="p-0.5 text-gray-400 hover:text-gray-600 rounded shrink-0"
                    >
                      <ChevronDownIcon open={!isCollapsed} />
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingId === objective.id ? (
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditing();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onBlur={saveEditing}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-base font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <h2
                          className="text-base font-semibold text-gray-800 cursor-pointer"
                          onDoubleClick={() =>
                            startEditing(objective.id, objective.title)
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
                          startEditing(objective.id, objective.title)
                        }
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                        title="수정"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteObjective(objective.id)}
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
                              {editingId === kr.id ? (
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) =>
                                    setEditingValue(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditing();
                                    if (e.key === 'Escape')
                                      setEditingId(null);
                                  }}
                                  onBlur={saveEditing}
                                  className="w-full px-2 py-1 border border-blue-300 rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                              ) : (
                                <h3
                                  className="text-sm font-medium text-gray-700 cursor-pointer"
                                  onDoubleClick={() =>
                                    startEditing(kr.id, kr.title)
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
                                  startEditing(kr.id, kr.title)
                                }
                                className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                                title="수정"
                              >
                                <PencilIcon />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteKeyResult(kr.id)}
                                className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                                title="삭제"
                              >
                                <TrashIcon />
                              </button>
                              <button
                                type="button"
                                onClick={() => setLinkModalKRId(kr.id)}
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
                            onClick={() => setCanvasKRId(kr.id)}
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
                    {addingKRForObjective === objective.id ? (
                      <div className="pt-4">
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={newKRTitle}
                            onChange={(e) => setNewKRTitle(e.target.value)}
                            placeholder="KR 제목을 입력하세요"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter')
                                addKeyResult(objective.id);
                              if (e.key === 'Escape')
                                setAddingKRForObjective(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => addKeyResult(objective.id)}
                            disabled={!newKRTitle.trim()}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            추가
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingKRForObjective(null)}
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
                          setAddingKRForObjective(objective.id);
                          setNewKRTitle('');
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
      {linkModalKRId && (
        <LinkModal
          existingIssueKeys={getExistingIssueKeys(linkModalKRId)}
          allIssues={allIssues}
          onLinkJira={(issueKeys) => linkJiraIssues(linkModalKRId, issueKeys)}
          onCreateVirtual={(title, issueType, assignee) =>
            createAndLinkVirtual(linkModalKRId, title, issueType, assignee)
          }
          onClose={() => setLinkModalKRId(null)}
        />
      )}

      {/* ── KR Canvas Modal ────────────────────────────────────────────── */}
      {canvasKRId && (() => {
        const kr = okr.keyResults.find((k) => k.id === canvasKRId);
        if (!kr) return null;
        return (
          <KRCanvasModal
            kr={kr}
            okr={okr}
            issueMap={issueMap}
            allIssues={allIssues}
            baseUrl={baseUrl}
            onClose={() => setCanvasKRId(null)}
            updateOKR={updateOKR}
            openIssueDetail={openIssueDetail}
          />
        );
      })()}
    </div>
  );
}
