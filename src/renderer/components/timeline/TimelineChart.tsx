import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NormalizedIssue } from '../../types/jira.types';
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
}

interface TreeNode {
  issue: NormalizedIssue;
  depth: number;
  hasChildren: boolean;
}

const ROW_HEIGHT = 32;
const LABEL_WIDTH = 380;
const MIN_CHART_WIDTH = 800;
const INDENT_PX = 20;

const DAY_WIDTH_MAP: Record<ViewMode, number> = {
  month: 3,
  week: 12,
  day: 40,
};

function buildTree(issues: NormalizedIssue[]): TreeNode[] {
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
  const sortFn = (a: NormalizedIssue, b: NormalizedIssue) => {
    const aIsEpic = a.issueType.toLowerCase() === 'epic' ? 0 : 1;
    const bIsEpic = b.issueType.toLowerCase() === 'epic' ? 0 : 1;
    if (aIsEpic !== bIsEpic) return aIsEpic - bIsEpic;
    return new Date(a.created).getTime() - new Date(b.created).getTime();
  };

  roots.sort(sortFn);

  const result: TreeNode[] = [];

  function walk(node: NormalizedIssue, depth: number) {
    const children = childrenOf.get(node.key) ?? [];
    children.sort(sortFn);
    result.push({ issue: node, depth, hasChildren: children.length > 0 });
    for (const child of children) {
      walk(child, depth + 1);
    }
  }

  for (const root of roots) {
    walk(root, 0);
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

const issueTypeIcons: Record<string, string> = {
  epic: '⚡',
  story: '📗',
  task: '✅',
  'sub-task': '🔹',
  subtask: '🔹',
  bug: '🐛',
};

const depthIcons: Record<number, string> = {
  0: '⚡',
  1: '📗',
  2: '🔹',
};

function getIssueIcon(issueType: string, depth: number): string {
  return issueTypeIcons[issueType.toLowerCase()] ?? depthIcons[depth] ?? '📄';
}

const issueTypeBadge: Record<string, string> = {
  epic: 'bg-purple-100 text-purple-700',
  story: 'bg-blue-100 text-blue-700',
  task: 'bg-emerald-100 text-emerald-700',
  'sub-task': 'bg-cyan-100 text-cyan-700',
  subtask: 'bg-cyan-100 text-cyan-700',
  bug: 'bg-red-100 text-red-700',
};

const depthBadge: Record<number, string> = {
  0: 'bg-purple-100 text-purple-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-cyan-100 text-cyan-700',
};

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;

export default function TimelineChart({ issues, baseUrl, viewMode, zoom, onZoomChange, scrollToTodayTrigger, hiddenTypes }: TimelineChartProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
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

  const tree = useMemo(() => buildTree(issues), [issues]);
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
        <div className="sticky top-0 z-10 h-10 border-b border-gray-200 bg-gray-50 flex items-center px-3">
          <span className="text-xs font-medium text-gray-500">이슈</span>
        </div>
        <div>
          {visibleNodes.map((node, index) => {
            const typeKey = node.issue.issueType.toLowerCase();
            const isEpic = typeKey === 'epic';
            const badgeClass = issueTypeBadge[typeKey] ?? depthBadge[node.depth] ?? 'bg-gray-100 text-gray-600';
            const zebra = index % 2 === 1 ? 'bg-gray-50/50' : '';

            return (
              <div
                key={node.issue.key}
                className={`flex items-center border-b border-gray-100 text-xs ${isEpic ? 'bg-purple-50' : zebra}`}
                style={{ height: ROW_HEIGHT, paddingLeft: 8 + node.depth * INDENT_PX }}
                title={`${node.issue.key}: ${node.issue.summary}`}
              >
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
                <span className="mr-1 shrink-0">{getIssueIcon(node.issue.issueType, node.depth)}</span>
                <span className={`px-1 py-0.5 rounded text-[9px] font-medium shrink-0 mr-1.5 ${badgeClass}`}>
                  {node.issue.key}
                </span>
                <span className={`truncate flex-1 min-w-0 ${isEpic ? 'text-purple-800 font-semibold' : 'text-gray-600'}`}>
                  {node.issue.summary}
                </span>
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
                style={{ left: todayOffset, height: visibleNodes.length * ROW_HEIGHT }}
              />
            )}

            {/* Grid rows + bars */}
            {visibleNodes.map((node, index) => {
              const startDate = new Date(node.issue.created);
              const endDate = node.issue.dueDate ? new Date(node.issue.dueDate) : today;

              const left = ((startDate.getTime() - rangeStart.getTime()) / totalMs) * totalWidth;
              const width = ((endDate.getTime() - startDate.getTime()) / totalMs) * totalWidth;

              const typeKey = node.issue.issueType.toLowerCase();
              const isEpicRow = typeKey === 'epic';
              const zebra = index % 2 === 1 ? 'bg-gray-50/50' : '';

              const isBarHidden = hiddenTypes.size > 0 && hiddenTypes.has(typeKey);

              return (
                <div
                  key={node.issue.key}
                  className={`relative border-b border-gray-100 ${isEpicRow ? 'bg-purple-50' : zebra}`}
                  style={{ height: ROW_HEIGHT }}
                >
                  {!isBarHidden && (
                    <TimelineBar
                      issue={node.issue}
                      left={left}
                      width={width}
                      depth={node.depth}
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
