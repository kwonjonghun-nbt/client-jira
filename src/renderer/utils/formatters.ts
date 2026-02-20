import { format, parseISO, differenceInMinutes, differenceInHours, differenceInDays, differenceInMonths } from 'date-fns';

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyy. MM. dd.');
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyy. MM. dd. HH:mm');
}

export function formatRelativeTime(dateStr: string, now?: Date): string {
  const date = parseISO(dateStr);
  const ref = now ?? new Date();
  const minutes = differenceInMinutes(ref, date);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = differenceInHours(ref, date);
  if (hours < 24) return `${hours}시간 전`;
  const days = differenceInDays(ref, date);
  if (days < 30) return `${days}일 전`;
  return `${differenceInMonths(ref, date)}개월 전`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}분 ${remainingSeconds}초`;
}

// null-safe 날짜 포맷 (YYYY. MM. DD. format)
export function formatDateSafe(dateStr: string | null): string {
  if (!dateStr) return '-';
  return format(parseISO(dateStr), 'yyyy. MM. dd.');
}

// 짧은 날짜 포맷 (MM/DD format)
export function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '-';
  return format(parseISO(dateStr), 'MM/dd');
}
