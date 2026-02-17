import { parseISO, differenceInMilliseconds } from 'date-fns';
import type { JiraChangelogHistory, StatusTransition, StatusTransitionAnalysis, IssueTransitionSummary } from '../types/jira.types';

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

/**
 * 여러 이슈의 상태 전환을 요약 데이터로 변환한다 (AI 프롬프트용).
 */
export function buildTransitionSummary(
  issueKey: string,
  histories: JiraChangelogHistory[],
  currentStatus: string,
): IssueTransitionSummary {
  const transitions = extractStatusTransitions(histories);
  const analysis = analyzeStatusTransitions(transitions, currentStatus);

  return {
    issueKey,
    currentStatus,
    transitions: transitions.map((t) => ({
      from: t.fromStatus,
      to: t.toStatus,
      at: t.transitionedAt,
      durationMs: t.durationMs,
    })),
    bottleneck: analysis.bottleneck,
    totalDurationMs: analysis.totalDurationMs,
    flags: detectTransitionFlags(transitions),
  };
}

/**
 * 비정상 전환 패턴을 감지한다.
 * - no_transitions: 상태 변경 이력 없음
 * - single_jump: 중간 단계 없이 한 번에 완료
 * - reverse_transition: 역방향 전환 (완료→진행중 등)
 * - rapid_transition: 작업 단계에서 5분 이내 전환 (형식적 상태 변경 의심)
 */
export function detectTransitionFlags(transitions: StatusTransition[]): string[] {
  const flags: string[] = [];

  if (transitions.length === 0) {
    flags.push('no_transitions');
    return flags;
  }

  if (transitions.length === 1) {
    flags.push('single_jump');
  }

  const RAPID_THRESHOLD_MS = 5 * 60 * 1000; // 5분
  const SKIP_STATUSES = new Set(['backlog', 'open', 'to do', 'todo', '백로그', '열기']);

  for (const t of transitions) {
    if (t.fromStatus && isReverseTransition(t.fromStatus, t.toStatus)) {
      flags.push('reverse_transition');
    }
    if (
      t.durationMs !== null &&
      t.durationMs < RAPID_THRESHOLD_MS &&
      t.fromStatus &&
      !SKIP_STATUSES.has(t.fromStatus.toLowerCase())
    ) {
      flags.push('rapid_transition');
    }
  }

  return [...new Set(flags)];
}

/**
 * 역방향 전환인지 판별한다.
 * 일반적인 Jira 워크플로우 순서: To Do → In Progress → Testing/Review → Done
 */
function isReverseTransition(fromStatus: string, toStatus: string): boolean {
  const ORDER: Record<string, number> = {
    'backlog': 0, '백로그': 0,
    'open': 1, '열기': 1, 'to do': 1, 'todo': 1,
    'in progress': 2, '진행 중': 2, '진행중': 2,
    'in review': 3, '리뷰': 3, '리뷰 중': 3, 'review': 3,
    'in testing': 3, '테스트': 3, '테스트 중': 3, 'testing': 3,
    'done': 4, '완료': 4, 'closed': 4,
  };
  const fromOrder = ORDER[fromStatus.toLowerCase()];
  const toOrder = ORDER[toStatus.toLowerCase()];
  if (fromOrder === undefined || toOrder === undefined) return false;
  return fromOrder > toOrder;
}
