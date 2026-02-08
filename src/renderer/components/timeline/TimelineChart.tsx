import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
const LABEL_WIDTH = 380;
const MIN_CHART_WIDTH = 800;
const INDENT_PX = 20;

const DAY_WIDTH_MAP: Record<ViewMode, number> = {
  month: 3,
  week: 12,
  day: 40,
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
    return new Date(a.created).getTime() - new Date(b.created).getTime();
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

  const start = new Date(minDate);
  start.setDate(start.getDate() - 14);

  // 미래 날짜를 넉넉히 보여줌: 마지막 이슈 이후 최소 3개월, 또는 오늘로부터 최소 6개월
  const threeMonthsAfterMax = new Date(maxDate);
  threeMonthsAfterMax.setMonth(threeMonthsAfterMax.getMonth() + 3);
  const sixMonthsFromNow = new Date(now);
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
  const futureEnd = new Date(Math.max(threeMonthsAfterMax.getTime(), sixMonthsFromNow.getTime()));

  return { rangeStart: start, rangeEnd: futureEnd };
}

// 한글/영문 이슈타입을 정규화된 키로 변환
const issueTypeAliases: Record<string, string> = {
  epic: 'epic', '에픽': 'epic',
  story: 'story', '스토리': 'story', '새기능': 'story', '새 기능': 'story',
  task: 'task', '작업': 'task',
  'sub-task': 'sub-task', subtask: 'sub-task', '하위작업': 'sub-task', '하위 작업': 'sub-task',
  bug: 'bug', '버그': 'bug',
};

function normalizeType(issueType: string): string {
  return issueTypeAliases[issueType.toLowerCase()] ?? 'task';
}

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
        onZoomChange(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + delta)));
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
  const todayOffset = ((today.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
  const showTodayLine = today >= rangeStart && today <= rangeEnd;

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
        style={{ width: LABEL_WIDTH }}
        onScroll={() => syncScroll('label')}
      >
        <div className={`sticky top-0 z-10 border-b border-gray-200 bg-gray-50 flex items-end px-3 pb-2 ${viewMode === 'month' ? 'h-10' : 'h-14'}`}>
          <span className="text-xs font-medium text-gray-500">이슈</span>
        </div>
        <div>
          {displayNodes.map((node, index) => {
            const normalized = normalizeType(node.issue.issueType);
            const rowStyle = issueTypeRowStyle[normalized];
            const badgeClass = issueTypeBadge[normalized] ?? 'bg-gray-100 text-gray-600';
            const zebra = index % 2 === 1 ? 'bg-gray-50/50' : '';

            const isDragging = dragKey === node.issue.key;
            const isDropTarget = dropTarget === node.issue.key;

            return (
              <div
                key={node.issue.key}
                className={`flex items-center border-b text-xs ${
                  isDropTarget ? 'border-t-2 border-t-blue-400 border-b-gray-100' : 'border-b-gray-100'
                } ${rowStyle ?? zebra} ${isDragging ? 'opacity-40' : ''}`}
                style={{ height: ROW_HEIGHT, paddingLeft: rowStyle ? 1 + node.depth * INDENT_PX : 4 + node.depth * INDENT_PX }}
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
                {node.issue.assignee && (
                  <span className="text-gray-400 shrink-0 ml-1 text-[10px]">{node.issue.assignee}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

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

          <div className="relative">
            {/* Today line */}
            {showTodayLine && (
              <div
                className="absolute top-0 w-px bg-red-400 z-10"
                style={{ left: todayOffset, height: displayNodes.length * ROW_HEIGHT }}
              />
            )}

            {/* Grid rows + bars */}
            {displayNodes.map((node, index) => {
              const hasDueDate = !!node.issue.dueDate;
              const startDate = new Date(node.issue.created);
              const endDate = hasDueDate ? new Date(node.issue.dueDate!) : today;

              const left = ((startDate.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
              const width = ((endDate.getTime() - startDate.getTime()) / totalMs) * totalWidth;

              const normalizedType = normalizeType(node.issue.issueType);
              const chartRowStyle = issueTypeRowStyle[normalizedType];
              const zebra = index % 2 === 1 ? 'bg-gray-50/50' : '';

              const isBarHidden = (hiddenTypes.size > 0 && hiddenTypes.has(node.issue.issueType.toLowerCase())) || !hasDueDate;

              return (
                <div
                  key={node.issue.key}
                  className={`relative border-b border-gray-100 ${chartRowStyle ?? zebra}`}
                  style={{ height: ROW_HEIGHT }}
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
          </div>
        </div>
      </div>
    </div>
  );
}
