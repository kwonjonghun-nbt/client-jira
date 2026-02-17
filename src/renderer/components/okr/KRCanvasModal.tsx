import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useCanvasTransform } from '../../hooks/okr/useCanvasTransform';
import { useCanvasDrag } from '../../hooks/okr/useCanvasDrag';
import { useCanvasRelations } from '../../hooks/okr/useCanvasRelations';
import { useTicketActions } from '../../hooks/okr/useTicketActions';
import { useGroupActions } from '../../hooks/okr/useGroupActions';
import { useWaypointDrag } from '../../hooks/okr/useWaypointDrag';
import { findBestInsertIndex } from '../../utils/anchor-points';
import { useUIStore } from '../../store/uiStore';
import { calcKRProgress } from '../../utils/okr';
import { XIcon, LinkIcon, ArrowRightIcon, PlusIcon } from '../common/Icons';
import JiraCard from './JiraCard';
import VirtualCard from './VirtualCard';
import GroupContainer from './GroupContainer';
import LinkModal from './LinkModal';
import {
  CARD_W,
  CARD_H,
  MIN_ZOOM,
  MAX_ZOOM,
} from '../../hooks/okr/okr-canvas.types';
import type {
  OKRData,
  OKRKeyResult,
  OKRLink,
  OKRGroup,
  NormalizedIssue,
} from '../../types/jira.types';

export interface KRCanvasModalProps {
  kr: OKRKeyResult;
  okr: OKRData;
  issueMap: Map<string, NormalizedIssue>;
  allIssues: NormalizedIssue[];
  baseUrl?: string;
  onClose: () => void;
  updateOKR: (updater: (draft: OKRData) => OKRData) => void;
  openIssueDetail: (issue: NormalizedIssue, baseUrl?: string) => void;
}

export default function KRCanvasModal({
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
  const groupsRef = useRef<OKRGroup[]>([]);

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
          className="flex-1 overflow-hidden relative cursor-grab"
          style={{ backgroundColor: '#e8e8ec' }}
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
              backgroundColor: '#ffffff',
              backgroundImage:
                'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
              backgroundSize: '20px 20px',
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
