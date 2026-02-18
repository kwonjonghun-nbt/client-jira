import type { DailyShareSlide } from './daily-share';

export type AITaskType = 'report' | 'daily-share' | 'daily-share-multi' | 'issue-analysis';
export type AITaskStatus = 'running' | 'done' | 'error';

export interface AITask {
  id: string;
  jobIds: string[];
  type: AITaskType;
  title: string;
  status: AITaskStatus;
  result: string;
  error: string | null;
  createdAt: number;
  subJobs?: Record<string, { assignee: string; status: AITaskStatus; result: string }>;
  slides?: DailyShareSlide[];
}

export function createTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateTaskTitle(
  type: AITaskType,
  meta: { assignee?: string; startDate?: string; endDate?: string; issueKey?: string },
): string {
  if (type === 'issue-analysis') {
    return meta.issueKey ? `티켓 분석 (${meta.issueKey})` : '티켓 분석';
  }
  if (type === 'report') {
    const parts = [
      meta.assignee,
      meta.startDate && meta.endDate ? `${meta.startDate}~${meta.endDate}` : null,
    ].filter(Boolean);
    return parts.length > 0 ? `리포트 생성 (${parts.join(', ')})` : '리포트 생성';
  }
  if (type === 'daily-share') {
    return meta.assignee ? `일일공유 (${meta.assignee})` : '일일공유';
  }
  return '일일공유 (전체)';
}

export function countRunningTasks(tasks: AITask[]): number {
  return tasks.filter((t) => t.status === 'running').length;
}

export function countCompletedTasks(tasks: AITask[]): number {
  return tasks.filter((t) => t.status === 'done' || t.status === 'error').length;
}

export function mergeSubJobResults(
  subJobs: Record<string, { assignee: string; result: string }>,
): string {
  return Object.values(subJobs)
    .filter((j) => j.result.trim())
    .map((j) => `## ${j.assignee}\n\n${j.result.trim()}`)
    .join('\n\n---\n\n');
}

export function formatElapsedTime(createdAt: number): string {
  const elapsed = Math.floor((Date.now() - createdAt) / 1000);
  if (elapsed < 60) return `${elapsed}초 전 시작`;
  const minutes = Math.floor(elapsed / 60);
  if (minutes < 60) return `${minutes}분 전 시작`;
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 전 시작`;
}
