import { parseISO, differenceInMilliseconds } from 'date-fns';
import type { JiraChangelogHistory, StatusTransition, StatusTransitionAnalysis } from '../types/jira.types';

/**
 * Jira changelog histories에서 status 전환만 추출하고 소요시간을 계산한다.
 * histories는 created 기준 오름차순으로 정렬된다.
 */
export function extractStatusTransitions(histories: JiraChangelogHistory[]): StatusTransition[] {
  // 1. created 기준 오름차순 정렬
  const sorted = [...histories].sort(
    (a, b) => parseISO(a.created).getTime() - parseISO(b.created).getTime(),
  );

  // 2. status 변경 항목만 추출
  const transitions: StatusTransition[] = [];
  for (const history of sorted) {
    for (const item of history.items) {
      if (item.field === 'status') {
        const prev = transitions[transitions.length - 1];
        const currentTime = parseISO(history.created);
        const durationMs = prev
          ? differenceInMilliseconds(currentTime, parseISO(prev.transitionedAt))
          : null;

        transitions.push({
          fromStatus: item.fromString,
          toStatus: item.toString!,
          transitionedAt: history.created,
          durationMs,
        });
      }
    }
  }

  return transitions;
}

/**
 * 상태 전환 목록을 분석하여 병목 구간을 식별한다.
 */
export function analyzeStatusTransitions(
  transitions: StatusTransition[],
  currentStatus: string,
): StatusTransitionAnalysis {
  if (transitions.length === 0) {
    return { transitions, currentStatus, bottleneck: null, totalDurationMs: 0 };
  }

  // 병목: durationMs가 가장 큰 전환 (첫 번째 전환은 durationMs가 null이므로 제외)
  let bottleneck: StatusTransitionAnalysis['bottleneck'] = null;
  let maxDuration = 0;

  for (const t of transitions) {
    if (t.durationMs !== null && t.durationMs > maxDuration) {
      maxDuration = t.durationMs;
      bottleneck = { fromStatus: t.fromStatus, toStatus: t.toStatus, durationMs: t.durationMs };
    }
  }

  // 총 소요시간: 첫 전환 ~ 마지막 전환
  const first = parseISO(transitions[0].transitionedAt);
  const last = parseISO(transitions[transitions.length - 1].transitionedAt);
  const totalDurationMs = differenceInMilliseconds(last, first);

  return { transitions, currentStatus, bottleneck, totalDurationMs };
}

/**
 * 밀리초를 사람이 읽을 수 있는 한국어 형식으로 변환한다.
 * 예: "2일 3시간", "45분", "3시간 20분"
 */
export function formatTransitionDuration(ms: number): string {
  if (ms < 0) return '0분';

  const minutes = Math.floor(ms / (1000 * 60));
  if (minutes < 1) return '1분 미만';
  if (minutes < 60) return `${minutes}분`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}일 ${remainingHours}시간` : `${days}일`;
}
