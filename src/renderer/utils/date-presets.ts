import { format, subDays } from 'date-fns';

export function computeDatePresetRange(days: number, now?: Date): { start: string; end: string } {
  if (days === 0) return { start: '', end: '' };
  const ref = now ?? new Date();
  return {
    start: format(subDays(ref, days), 'yyyy-MM-dd'),
    end: format(ref, 'yyyy-MM-dd'),
  };
}
