import { parseISO, subDays, addMonths, max, compareAsc } from 'date-fns';
import type { ViewMode } from '../components/timeline/TimelineHeader';
import type { NormalizedIssue } from '../types/jira.types';
import { normalizeType } from './issue';

export const VIEW_MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'month', label: '월' },
  { value: 'week', label: '주' },
];

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 0.25;

/**
 * Filter issues by date range
 * An issue is included if its created or dueDate falls within the range,
 * or if the issue spans the entire selected range
 */
export function filterByDateRange(
  issues: NormalizedIssue[],
  dateStart: string,
  dateEnd: string
): NormalizedIssue[] {
  if (!dateStart && !dateEnd) return issues;
  const startMs = dateStart ? parseISO(dateStart).getTime() : 0;
  const endMs = dateEnd ? parseISO(dateEnd + 'T23:59:59').getTime() : Infinity;

  return issues.filter((issue) => {
    const createdMs = parseISO(issue.created).getTime();
    const dueMs = issue.dueDate ? parseISO(issue.dueDate).getTime() : null;
    // created가 기간 안에 있거나, dueDate가 기간 안에 있거나, 이슈 기간이 선택 기간을 감싸는 경우
    const createdInRange = createdMs >= startMs && createdMs <= endMs;
    const dueInRange = dueMs !== null && dueMs >= startMs && dueMs <= endMs;
    const spansRange = dueMs !== null && createdMs <= startMs && dueMs >= endMs;
    return createdInRange || dueInRange || spansRange;
  });
}

/**
 * Filter issues by hidden row types
 */
export function filterByRowTypes(
  issues: NormalizedIssue[],
  hiddenRowTypes: Set<string>
): NormalizedIssue[] {
  if (hiddenRowTypes.size === 0) return issues;
  return issues.filter((issue) => !hiddenRowTypes.has(issue.issueType.toLowerCase()));
}

/**
 * Extract unique issue type options from issues (deduplicated)
 */
export function extractIssueTypeOptions(
  issues: NormalizedIssue[]
): { value: string; label: string }[] {
  const types = new Map<string, string>();
  for (const issue of issues) {
    const key = issue.issueType.toLowerCase();
    if (!types.has(key)) types.set(key, issue.issueType);
  }
  return Array.from(types.entries()).map(([key, name]) => ({ value: key, label: name }));
}

// ── TimelineChart 전용 상수 ──────────────────────────────────────────────────

export const ROW_HEIGHT = 32;
export const DEFAULT_LABEL_WIDTH = 380;
export const MIN_LABEL_WIDTH = 200;
export const MAX_LABEL_WIDTH = 600;
export const MIN_CHART_WIDTH = 800;
export const INDENT_PX = 20;

export const DAY_WIDTH_MAP: Record<ViewMode, number> = {
  month: 3,
  week: 36,
};

export const ORDER_STORAGE_KEY = 'timeline-order-overrides';

// ── 타입 ─────────────────────────────────────────────────────────────────────

export interface TreeNode {
  issue: NormalizedIssue;
  depth: number;
  hasChildren: boolean;
  parentKey: string | null;
}

// parentKey -> key[] 순서 오버라이드 (null = 루트)
export type OrderOverrides = Map<string | null, string[]>;

// ── 아이콘 / 배지 / 스타일 맵 ────────────────────────────────────────────────

export const issueTypeIcons: Record<string, string> = {
  epic: '⚡',
  story: '📗',
  task: '✅',
  'sub-task': '🔹',
  bug: '🐛',
};

export function getIssueIcon(issueType: string): string {
  return issueTypeIcons[normalizeType(issueType)] ?? '📄';
}

export const issueTypeBadge: Record<string, string> = {
  epic: 'bg-purple-100 text-purple-700',
  story: 'bg-blue-100 text-blue-700',
  task: 'bg-emerald-100 text-emerald-700',
  'sub-task': 'bg-cyan-100 text-cyan-700',
  bug: 'bg-red-100 text-red-700',
};

export const statusCategoryCls: Record<string, string> = {
  new: 'bg-gray-200 text-gray-600',
  indeterminate: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

// 로우 좌측 보더 + 배경 스타일
export const issueTypeRowStyle: Record<string, string> = {
  epic: 'bg-purple-50 border-l-3 border-l-purple-500',
  story: 'bg-blue-50/40 border-l-3 border-l-blue-400',
};

// ── 트리 빌드 ────────────────────────────────────────────────────────────────

export function buildTree(issues: NormalizedIssue[], orderOverrides: OrderOverrides): TreeNode[] {
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

// ── 날짜 범위 계산 ───────────────────────────────────────────────────────────

export function computeRange(issues: NormalizedIssue[]): { rangeStart: Date; rangeEnd: Date } {
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

// ── 순서 오버라이드 저장/불러오기 ────────────────────────────────────────────

export function loadOrderOverrides(): OrderOverrides {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return new Map();
    const entries: [string | null, string[]][] = JSON.parse(raw);
    return new Map(entries);
  } catch {
    return new Map();
  }
}

export function saveOrderOverrides(overrides: OrderOverrides) {
  const entries = Array.from(overrides.entries());
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(entries));
}
