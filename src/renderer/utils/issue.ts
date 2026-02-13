// 이슈 타입 정규화 (한글/영문 → 표준 키)
export const issueTypeAliases: Record<string, string> = {
  epic: 'epic',
  '에픽': 'epic',
  story: 'story',
  '스토리': 'story',
  '새기능': 'story',
  '새 기능': 'story',
  task: 'task',
  '작업': 'task',
  'sub-task': 'sub-task',
  subtask: 'sub-task',
  '하위작업': 'sub-task',
  '하위 작업': 'sub-task',
  bug: 'bug',
  '버그': 'bug',
};

export function normalizeType(t: string): string {
  return issueTypeAliases[t.toLowerCase()] ?? 'task';
}

// 이슈 타입별 색상 클래스
export const issueTypeColors: Record<string, string> = {
  epic: 'bg-purple-100 text-purple-700',
  story: 'bg-blue-100 text-blue-700',
  task: 'bg-emerald-100 text-emerald-700',
  'sub-task': 'bg-cyan-100 text-cyan-700',
  bug: 'bg-red-100 text-red-700',
};

// 상태 카테고리별 뱃지 클래스
export function statusBadgeClass(category: string): string {
  switch (category) {
    case 'done':
      return 'bg-green-100 text-green-700';
    case 'indeterminate':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

// 우선순위별 색상 클래스
export const priorityColors: Record<string, string> = {
  Highest: 'text-red-600',
  High: 'text-orange-500',
  Medium: 'text-yellow-500',
  Low: 'text-blue-500',
  Lowest: 'text-gray-400',
};

export function getPriorityColor(priority: string | null): string {
  return priorityColors[priority || ''] || 'text-gray-400';
}

// 이슈 타입 한글 라벨
export const issueTypeLabels: Record<string, string> = {
  epic: '에픽',
  story: '스토리',
  task: '작업',
  'sub-task': '하위작업',
  bug: '버그',
};

export function getIssueTypeLabel(normalizedType: string, fallback: string): string {
  return issueTypeLabels[normalizedType] ?? fallback;
}

// Jira 이슈 URL 생성
export function buildIssueUrl(baseUrl: string | undefined | null, issueKey: string): string | null {
  if (!baseUrl) return null;
  return `${baseUrl.replace(/\/+$/, '')}/browse/${issueKey}`;
}
