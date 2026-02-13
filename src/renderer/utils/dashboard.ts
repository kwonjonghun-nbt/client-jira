import type { ChangelogEntry } from '../types/jira.types';

export const DATE_PRESETS = [
  { label: '7일', days: 7 },
  { label: '30일', days: 30 },
  { label: '90일', days: 90 },
  { label: '전체', days: 0 },
];

export const changeTypeConfig: Record<ChangelogEntry['changeType'], { label: string; color: string }> = {
  created: { label: '신규 생성', color: 'bg-green-100 text-green-700' },
  status: { label: '상태 변경', color: 'bg-blue-100 text-blue-700' },
  assignee: { label: '담당자 변경', color: 'bg-purple-100 text-purple-700' },
  priority: { label: '우선순위 변경', color: 'bg-orange-100 text-orange-700' },
  storyPoints: { label: 'SP 변경', color: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: '해결됨', color: 'bg-emerald-100 text-emerald-700' },
};

export function getWeekRange(): [Date, Date] {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return [monday, sunday];
}

export function formatDateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatChangeValue(entry: ChangelogEntry): string {
  if (entry.changeType === 'created') return '신규 생성';
  if (entry.changeType === 'resolved') return `해결: ${entry.newValue}`;
  const old = entry.oldValue ?? '(없음)';
  const next = entry.newValue ?? '(없음)';
  return `${old} → ${next}`;
}
