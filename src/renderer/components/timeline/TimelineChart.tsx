import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { subDays, addMonths, addDays, max, startOfMonth, startOfWeek, eachWeekOfInterval, parseISO, compareAsc } from 'date-fns';
import { clamp } from 'es-toolkit';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { NormalizedIssue } from '../../types/jira.types';
import { useUIStore } from '../../store/uiStore';
import TimelineHeader from './TimelineHeader';
import type { ViewMode } from './TimelineHeader';
import TimelineBar from './TimelineBar';

interface TimelineChartProps {
  issues: NormalizedIssue[];
  baseUrl?: string;
  viewMode: ViewMode;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  scrollToTodayTrigger: number;
  hiddenTypes: Set<string>;
  hiddenRowTypes: Set<string>;
}

interface TreeNode {
  issue: NormalizedIssue;
  depth: number;
  hasChildren: boolean;
  parentKey: string | null;
}

// parentKey -> key[] 순서 오버라이드 (null = 루트)
type OrderOverrides = Map<string | null, string[]>;

const ROW_HEIGHT = 32;
const DEFAULT_LABEL_WIDTH = 380;
const MIN_LABEL_WIDTH = 200;
const MAX_LABEL_WIDTH = 600;
const MIN_CHART_WIDTH = 800;
const INDENT_PX = 20;

const DAY_WIDTH_MAP: Record<ViewMode, number> = {
  month: 3,
  week: 36,
};

function buildTree(issues: NormalizedIssue[], orderOverrides: OrderOverrides): TreeNode[] {
  const issueMap = new Map<string, NormalizedIssue>();
  for (const issue of issues) {
    issueMap.set(issue.key, issue);
  }

  // 부모가 없거나 부모가 데이터에 없는 이슈 = 루트
  const childrenOf = new Map<string, NormalizedIssue[]>();
  const roots: NormalizedIssue[] = [];

  for (const issue of issues) {
    if (issue.parent && issueMap.has(issue.parent)) {
      const siblings = childrenOf.get(issue.parent) ?? [];
      siblings.push(issue);
      childrenOf.set(issue.parent, siblings);
    } else {
      roots.push(issue);
    }
  }

  // 에픽을 먼저, 나머지를 created 순으로 정렬
  const defaultSort = (a: NormalizedIssue, b: NormalizedIssue) => {
    const aIsEpic = a.issueType.toLowerCase() === 'epic' ? 0 : 1;
    const bIsEpic = b.issueType.toLowerCase() === 'epic' ? 0 : 1;
    if (aIsEpic !== bIsEpic) return aIsEpic - bIsEpic;
    return compareAsc(parseISO(a.created), parseISO(b.created));
  };

  // 커스텀 순서가 있으면 적용, 없으면 기본 정렬
  const applySortOrder = (items: NormalizedIssue[], parentKey: string | null) => {
    const override = orderOverrides.get(parentKey);
    if (!override) {
      items.sort(defaultSort);
      return;
    }
    const orderMap = new Map(override.map((key, idx) => [key, idx]));
    items.sort((a, b) => {
      const ai = orderMap.get(a.key);
      const bi = orderMap.get(b.key);
      if (ai !== undefined && bi !== undefined) return ai - bi;
      if (ai !== undefined) return -1;
      if (bi !== undefined) return 1;
      return defaultSort(a, b);
    });
  };

  applySortOrder(roots, null);

  const result: TreeNode[] = [];

  function walk(node: NormalizedIssue, depth: number, parentKey: string | null) {
    const children = childrenOf.get(node.key) ?? [];
    applySortOrder(children, node.key);
    result.push({ issue: node, depth, hasChildren: children.length > 0, parentKey });
    for (const child of children) {
      walk(child, depth + 1, node.key);
    }
  }

  for (const root of roots) {
    walk(root, 0, null);
  }

  return result;
}

function computeRange(issues: NormalizedIssue[]): { rangeStart: Date; rangeEnd: Date } {
  const now = new Date();
  let minDate = now;
  let maxDate = now;

  for (const issue of issues) {
    const created = new Date(issue.created);
    if (created < minDate) minDate = created;
    const end = issue.dueDate ? new Date(issue.dueDate) : now;
    if (end > maxDate) maxDate = end;
  }

  const start = subDays(new Date(minDate), 14);

  // 미래 날짜를 넉넉히 보여줌: 마지막 이슈 이후 최소 3개월, 또는 오늘로부터 최소 6개월
  const futureEnd = max([addMonths(new Date(maxDate), 3), addMonths(now, 6)]);

  return { rangeStart: start, rangeEnd: futureEnd };
}

import { normalizeType } from '../../utils/issue';

const issueTypeIcons: Record<string, string> = {
  epic: '⚡',
  story: '📗',
  task: '✅',
  'sub-task': '🔹',
  bug: '🐛',
};

function getIssueIcon(issueType: string): string {
  return issueTypeIcons[normalizeType(issueType)] ?? '📄';
}

const issueTypeBadge: Record<string, string> = {
  epic: 'bg-purple-100 text-purple-700',
  story: 'bg-blue-100 text-blue-700',
  task: 'bg-emerald-100 text-emerald-700',
  'sub-task': 'bg-cyan-100 text-cyan-700',
  bug: 'bg-red-100 text-red-700',
};

const statusCategoryCls: Record<string, string> = {
  new: 'bg-gray-200 text-gray-600',
  indeterminate: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

// 로우 좌측 보더 + 배경 스타일
const issueTypeRowStyle: Record<string, string> = {
  epic: 'bg-purple-50 border-l-3 border-l-purple-500',
  story: 'bg-blue-50/40 border-l-3 border-l-blue-400',
};

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;

const ORDER_STORAGE_KEY = 'timeline-order-overrides';

function loadOrderOverrides(): OrderOverrides {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return new Map();
    const entries: [string | null, string[]][] = JSON.parse(raw);
    return new Map(entries);
  } catch {
    return new Map();
  }
}

function saveOrderOverrides(overrides: OrderOverrides) {
  const entries = Array.from(overrides.entries());
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(entries));
}

export default function TimelineChart({ issues, baseUrl, viewMode, zoom, onZoomChange, scrollToTodayTrigger, hiddenTypes, hiddenRowTypes }: TimelineChartProps) {
  const openIssueDetail = useUIStore((s) => s.openIssueDetail);
  const [labelWidth, setLabelWidth] = useState(DEFAULT_LABEL_WIDTH);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [orderOverrides, setOrderOverrides] = useState<OrderOverrides>(loadOrderOverrides);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  // 트랙패드 핀치 제스처 (ctrlKey + wheel) 로 줌
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.01;
        onZoomChange(clamp(zoom + delta, ZOOM_MIN, ZOOM_MAX));
      }
    },
    [zoom, onZoomChange],
  );

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const tree = useMemo(() => buildTree(issues, orderOverrides), [issues, orderOverrides]);
  const { rangeStart, rangeEnd } = useMemo(() => computeRange(issues), [issues]);

  const visibleNodes = useMemo(() => {
    const result: TreeNode[] = [];
    const hiddenParents = new Set<string>();

    for (const node of tree) {
      if (node.issue.parent && hiddenParents.has(node.issue.parent)) {
        hiddenParents.add(node.issue.key);
        continue;
      }
      if (collapsed.has(node.issue.key)) {
        hiddenParents.add(node.issue.key);
      }
      result.push(node);
    }
    return result;
  }, [tree, collapsed]);

  const displayNodes = useMemo(() => {
    if (hiddenRowTypes.size === 0) return visibleNodes;
    return visibleNodes.filter((node) => !hiddenRowTypes.has(node.issue.issueType.toLowerCase()));
  }, [visibleNodes, hiddenRowTypes]);

  const dayWidth = DAY_WIDTH_MAP[viewMode] * zoom;
  const totalDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
  const totalWidth = Math.max(totalDays * dayWidth, MIN_CHART_WIDTH);
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOffset = ((today.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
  const showTodayLine = today >= rangeStart && today <= rangeEnd;

  // Calculate today column highlight for the chart area
  const todayHighlightColumns = useMemo(() => {
    const columns: { left: number; width: number }[] = [];

    if (viewMode === 'month') {
      // Highlight the entire month containing today
      const monthStart = startOfMonth(today);
      const monthEnd = addMonths(monthStart, 1);
      const left = ((monthStart.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
      const right = ((monthEnd.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
      columns.push({ left, width: right - left });
    } else {
      // week view: highlight the entire week containing today (Monday-aligned)
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 7);
      const left = ((weekStart.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
      const right = ((weekEnd.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
      columns.push({ left, width: right - left });
    }

    return columns;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, rangeStart.getTime(), totalMs, totalWidth]);

  // 주 뷰: 주 경계선 위치 (월요일)
  const weekBorderOffsets = useMemo(() => {
    if (viewMode !== 'week') return [];
    return eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 1 }).map(
      (weekStart) => ((weekStart.getTime() - rangeStart.getTime()) / totalMs) * totalWidth,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, rangeStart.getTime(), rangeEnd.getTime(), totalMs, totalWidth]);

  // 오늘 날짜로 스크롤
  useEffect(() => {
    if (scrollToTodayTrigger === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, todayOffset - el.clientWidth / 2);
  }, [scrollToTodayTrigger, todayOffset]);

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 가상화: 좌측 라벨 패널을 스크롤 컨테이너로 사용
  const rowVirtualizer = useVirtualizer({
    count: displayNodes.length,
    getScrollElement: () => labelRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  // Y축 스크롤 동기화
  const syncScroll = useCallback((source: 'label' | 'chart') => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    const from = source === 'label' ? labelRef.current : scrollRef.current;
    const to = source === 'label' ? scrollRef.current : labelRef.current;
    if (from && to) {
      to.scrollTop = from.scrollTop;
    }
    isSyncing.current = false;
  }, []);

  // 패널 리사이즈 핸들 드래그
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = labelWidth;

    const onMouseMove = (ev: MouseEvent) => {
      const newWidth = clamp(startWidth + (ev.clientX - startX), MIN_LABEL_WIDTH, MAX_LABEL_WIDTH);
      setLabelWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [labelWidth]);

  // 드래그앤드롭: 같은 부모 안에서만 순서 변경
  const handleDrop = useCallback(
    (targetKey: string) => {
      if (!dragKey || dragKey === targetKey) return;
      const dragNode = visibleNodes.find((n) => n.issue.key === dragKey);
      const targetNode = visibleNodes.find((n) => n.issue.key === targetKey);
      if (!dragNode || !targetNode) return;
      // 같은 부모가 아니면 무시
      if (dragNode.parentKey !== targetNode.parentKey) return;

      const parentKey = dragNode.parentKey;
      // 현재 형제 순서 가져오기
      const siblings = tree
        .filter((n) => n.parentKey === parentKey)
        .map((n) => n.issue.key);

      const fromIdx = siblings.indexOf(dragKey);
      const toIdx = siblings.indexOf(targetKey);
      if (fromIdx === -1 || toIdx === -1) return;

      const newOrder = [...siblings];
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, dragKey);

      setOrderOverrides((prev) => {
        const next = new Map(prev);
        next.set(parentKey, newOrder);
        saveOrderOverrides(next);
        return next;
      });
      setDragKey(null);
      setDropTarget(null);
    },
    [dragKey, visibleNodes, tree],
  );

  if (issues.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg mb-1">타임라인에 표시할 이슈가 없습니다</p>
        <p className="text-sm">필터를 변경하거나 데이터를 싱크해주세요</p>
      </div>
    );
  }

  return (
    <div ref={chartRef} className="flex h-full">
      {/* Left: Issue labels with hierarchy */}
      <div
        ref={labelRef}
        className="shrink-0 border-r border-gray-200 bg-white overflow-y-auto overflow-x-hidden"
        style={{ width: labelWidth }}
        onScroll={() => syncScroll('label')}
      >
        <div className={`sticky top-0 z-10 border-b border-gray-200 bg-gray-50 flex items-end px-3 pb-2 ${viewMode === 'month' ? 'h-10' : 'h-14'}`}>
          <span className="text-xs font-medium text-gray-500">이슈</span>
        </div>
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const index = virtualRow.index;
            const node = displayNodes[index];
            const normalized = normalizeType(node.issue.issueType);
            const rowStyle = issueTypeRowStyle[normalized];
            const badgeClass = issueTypeBadge[normalized] ?? 'bg-gray-100 text-gray-600';
            const zebra = index % 2 === 1 ? 'bg-gray-50/50' : '';

            const isDragging = dragKey === node.issue.key;
            const isDropTarget = dropTarget === node.issue.key;

            return (
              <div
                key={node.issue.key}
                className={`absolute left-0 w-full flex items-center border-b text-xs pr-4 ${
                  isDropTarget ? 'border-t-2 border-t-blue-400 border-b-gray-100' : 'border-b-gray-100'
                } ${rowStyle ?? zebra} ${isDragging ? 'opacity-40' : ''}`}
                style={{ height: ROW_HEIGHT, top: virtualRow.start, paddingLeft: rowStyle ? 1 + node.depth * INDENT_PX : 4 + node.depth * INDENT_PX }}
                title={`${node.issue.key}: ${node.issue.summary}`}
                draggable
                onDragStart={(e) => {
                  setDragKey(node.issue.key);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragKey && dragKey !== node.issue.key) {
                    const dragNode = visibleNodes.find((n) => n.issue.key === dragKey);
                    if (dragNode && dragNode.parentKey === node.parentKey) {
                      setDropTarget(node.issue.key);
                    }
                  }
                }}
                onDragLeave={() => {
                  if (dropTarget === node.issue.key) setDropTarget(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(node.issue.key);
                }}
                onDragEnd={() => {
                  setDragKey(null);
                  setDropTarget(null);
                }}
              >
                {/* 드래그 핸들 */}
                <span className="w-4 shrink-0 text-gray-300 hover:text-gray-500 cursor-grab text-[10px] text-center select-none">⋮⋮</span>
                {/* 접기/펼치기 버튼 */}
                {node.hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleCollapse(node.issue.key)}
                    className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none p-0 shrink-0"
                  >
                    {collapsed.has(node.issue.key) ? '▶' : '▼'}
                  </button>
                ) : (
                  <span className="w-4 shrink-0" />
                )}
                <span className="mr-1 shrink-0">{getIssueIcon(node.issue.issueType)}</span>
                {baseUrl ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); window.electronAPI.shell.openExternal(`${baseUrl.replace(/\/+$/, '')}/browse/${node.issue.key}`); }}
                    className={`px-1 py-0.5 rounded text-[9px] font-medium shrink-0 mr-1.5 cursor-pointer border-none hover:opacity-70 ${badgeClass}`}
                  >
                    {node.issue.key}
                  </button>
                ) : (
                  <span className={`px-1 py-0.5 rounded text-[9px] font-medium shrink-0 mr-1.5 ${badgeClass}`}>
                    {node.issue.key}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openIssueDetail(node.issue, baseUrl); }}
                  className={`truncate flex-1 min-w-0 cursor-pointer bg-transparent border-none p-0 text-left text-xs hover:text-blue-600 ${normalized === 'epic' ? 'text-purple-800 font-semibold' : normalized === 'story' ? 'text-blue-700 font-medium' : 'text-gray-600'}`}
                >
                  {node.issue.summary}
                </button>
                <span className={`shrink-0 ml-1 px-1 py-px rounded text-[9px] font-medium leading-none ${statusCategoryCls[node.issue.statusCategory] ?? 'bg-gray-100 text-gray-500'}`}>
                  {node.issue.status}
                </span>
                {node.issue.assignee && (
                  <span className="text-gray-400 shrink-0 ml-1 text-[10px]">{node.issue.assignee}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resize handle */}
      <div
        className="shrink-0 w-1 cursor-col-resize bg-transparent hover:bg-blue-300 active:bg-blue-400 transition-colors"
        onMouseDown={handleResizeStart}
      />

      {/* Right: Chart area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onScroll={() => syncScroll('chart')}
      >
        <div style={{ width: totalWidth, minHeight: '100%' }}>
          <div className="sticky top-0 z-10">
            <TimelineHeader rangeStart={rangeStart} rangeEnd={rangeEnd} totalWidth={totalWidth} viewMode={viewMode} />
          </div>

          <div className="relative" style={{ height: rowVirtualizer.getTotalSize() }}>
            {/* Today column highlight */}
            {todayHighlightColumns.map((col, i) => (
              <div
                key={`today-col-${i}`}
                className="absolute top-0 bg-blue-50/60 pointer-events-none"
                style={{ left: col.left, width: col.width, height: rowVirtualizer.getTotalSize() }}
              />
            ))}

            {/* Week boundary lines */}
            {weekBorderOffsets.map((offset, i) => (
              <div
                key={`week-border-${i}`}
                className="absolute top-0 pointer-events-none"
                style={{ left: offset, height: rowVirtualizer.getTotalSize(), borderLeft: '2px solid #cbd5e1' }}
              />
            ))}

            {/* Today line */}
            {showTodayLine && (
              <div
                className="absolute top-0 w-px bg-red-400 z-10"
                style={{ left: todayOffset, height: rowVirtualizer.getTotalSize() }}
              />
            )}

            {/* Grid rows + bars (virtualized) */}
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const index = virtualRow.index;
              const node = displayNodes[index];
              const hasDueDate = !!node.issue.dueDate;

              // 날짜 시작(00:00)에 스냅 — startDate(스프린트 시작일) 우선, 없으면 created
              const startDate = new Date(node.issue.startDate ?? node.issue.created);
              startDate.setHours(0, 0, 0, 0);

              // 종료일 다음날 00:00에 스냅 (그 날짜 끝까지 바가 차지)
              const endRaw = hasDueDate ? new Date(node.issue.dueDate!) : today;
              const endDate = new Date(endRaw);
              endDate.setHours(0, 0, 0, 0);
              endDate.setDate(endDate.getDate() + 1);

              const left = ((startDate.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
              const rawWidth = ((endDate.getTime() - startDate.getTime()) / totalMs) * totalWidth;
              const width = Math.max(rawWidth, dayWidth);

              const normalizedType = normalizeType(node.issue.issueType);
              const chartRowStyle = issueTypeRowStyle[normalizedType];
              const zebra = index % 2 === 1 ? 'bg-gray-50/50' : '';

              const isBarHidden = (hiddenTypes.size > 0 && hiddenTypes.has(node.issue.issueType.toLowerCase())) || !hasDueDate;

              return (
                <div
                  key={node.issue.key}
                  className={`absolute left-0 w-full border-b border-gray-100 ${chartRowStyle ?? zebra}`}
                  style={{ height: ROW_HEIGHT, top: virtualRow.start }}
                >
                  {!isBarHidden && (
                    <TimelineBar
                      issue={node.issue}
                      left={left}
                      width={width}
                      baseUrl={baseUrl}
                    />
                  )}
                </div>
              );
            })}

            {/* Blocking relationship arrows */}
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              style={{ width: totalWidth, height: rowVirtualizer.getTotalSize() }}
            >
              <defs>
                <marker id="block-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L8,3 L0,6 Z" fill="#e11d48" />
                </marker>
              </defs>
              {displayNodes.flatMap((node, srcIdx) =>
                node.issue.issueLinks
                  .filter((link) => link.type === 'Blocks' && link.direction === 'outward')
                  .map((link) => {
                    const tgtIdx = displayNodes.findIndex((n) => n.issue.key === link.linkedIssueKey);
                    if (tgtIdx === -1) return null;

                    const tgtNode = displayNodes[tgtIdx];

                    // Source bar: right edge (end of blocker)
                    const srcEnd = node.issue.dueDate ? new Date(node.issue.dueDate) : today;
                    const srcEndX = ((srcEnd.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
                    const srcY = srcIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

                    // Target bar: left edge (start of blocked)
                    const tgtStart = new Date(tgtNode.issue.startDate ?? tgtNode.issue.created);
                    const tgtStartX = ((tgtStart.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
                    const tgtY = tgtIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

                    const midX = srcEndX + (tgtStartX - srcEndX) / 2;

                    return (
                      <path
                        key={`block-${node.issue.key}-${link.linkedIssueKey}`}
                        d={`M${srcEndX},${srcY} C${midX},${srcY} ${midX},${tgtY} ${tgtStartX},${tgtY}`}
                        fill="none"
                        stroke="#e11d48"
                        strokeWidth="1.5"
                        strokeDasharray="6 3"
                        markerEnd="url(#block-arrow)"
                        opacity="0.7"
                      />
                    );
                  }),
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
