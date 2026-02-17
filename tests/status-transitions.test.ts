import {
  extractStatusTransitions,
  analyzeStatusTransitions,
  formatTransitionDuration,
} from '@renderer/utils/status-transitions';
import type { JiraChangelogHistory } from '@renderer/types/jira.types';

describe('extractStatusTransitions', () => {
  it('빈 배열이면 빈 배열을 반환한다', () => {
    expect(extractStatusTransitions([])).toEqual([]);
  });

  it('status 변경만 추출한다 (다른 field 무시)', () => {
    const histories: JiraChangelogHistory[] = [
      {
        created: '2026-02-01T09:00:00.000+0900',
        items: [
          { field: 'assignee', fromString: '홍길동', toString: '김철수' },
          { field: 'status', fromString: 'To Do', toString: 'In Progress' },
          { field: 'priority', fromString: 'Medium', toString: 'High' },
        ],
      },
    ];
    const result = extractStatusTransitions(histories);
    expect(result).toHaveLength(1);
    expect(result[0].fromStatus).toBe('To Do');
    expect(result[0].toStatus).toBe('In Progress');
  });

  it('created 기준 오름차순으로 정렬한다', () => {
    const histories: JiraChangelogHistory[] = [
      {
        created: '2026-02-10T09:00:00.000+0900',
        items: [{ field: 'status', fromString: 'In Progress', toString: 'Done' }],
      },
      {
        created: '2026-02-01T09:00:00.000+0900',
        items: [{ field: 'status', fromString: 'To Do', toString: 'In Progress' }],
      },
    ];
    const result = extractStatusTransitions(histories);
    expect(result).toHaveLength(2);
    expect(result[0].toStatus).toBe('In Progress');
    expect(result[1].toStatus).toBe('Done');
  });

  it('첫 번째 전환의 durationMs는 null이다', () => {
    const histories: JiraChangelogHistory[] = [
      {
        created: '2026-02-01T09:00:00.000+0900',
        items: [{ field: 'status', fromString: 'To Do', toString: 'In Progress' }],
      },
    ];
    const result = extractStatusTransitions(histories);
    expect(result[0].durationMs).toBeNull();
  });

  it('연속 전환 간 소요시간을 계산한다', () => {
    const histories: JiraChangelogHistory[] = [
      {
        created: '2026-02-01T09:00:00.000+0900',
        items: [{ field: 'status', fromString: 'To Do', toString: 'In Progress' }],
      },
      {
        created: '2026-02-03T09:00:00.000+0900', // 2일 후
        items: [{ field: 'status', fromString: 'In Progress', toString: 'Testing' }],
      },
      {
        created: '2026-02-04T15:00:00.000+0900', // 1일 6시간 후
        items: [{ field: 'status', fromString: 'Testing', toString: 'Done' }],
      },
    ];
    const result = extractStatusTransitions(histories);
    expect(result).toHaveLength(3);
    expect(result[0].durationMs).toBeNull();
    expect(result[1].durationMs).toBe(2 * 24 * 60 * 60 * 1000); // 2일
    expect(result[2].durationMs).toBe(30 * 60 * 60 * 1000); // 30시간
  });

  it('status 변경이 없으면 빈 배열을 반환한다', () => {
    const histories: JiraChangelogHistory[] = [
      {
        created: '2026-02-01T09:00:00.000+0900',
        items: [{ field: 'assignee', fromString: null, toString: '홍길동' }],
      },
    ];
    expect(extractStatusTransitions(histories)).toEqual([]);
  });
});

describe('analyzeStatusTransitions', () => {
  it('빈 전환이면 병목 없음을 반환한다', () => {
    const result = analyzeStatusTransitions([], 'To Do');
    expect(result.bottleneck).toBeNull();
    expect(result.totalDurationMs).toBe(0);
    expect(result.currentStatus).toBe('To Do');
  });

  it('가장 오래 걸린 구간을 병목으로 식별한다', () => {
    const transitions = [
      { fromStatus: 'To Do', toStatus: 'In Progress', transitionedAt: '2026-02-01T09:00:00.000+0900', durationMs: null },
      { fromStatus: 'In Progress', toStatus: 'Testing', transitionedAt: '2026-02-03T09:00:00.000+0900', durationMs: 2 * 24 * 3600_000 },
      { fromStatus: 'Testing', toStatus: 'Review', transitionedAt: '2026-02-08T09:00:00.000+0900', durationMs: 5 * 24 * 3600_000 },
      { fromStatus: 'Review', toStatus: 'Done', transitionedAt: '2026-02-09T09:00:00.000+0900', durationMs: 1 * 24 * 3600_000 },
    ];
    const result = analyzeStatusTransitions(transitions, 'Done');
    expect(result.bottleneck).toEqual({
      fromStatus: 'Testing',
      toStatus: 'Review',
      durationMs: 5 * 24 * 3600_000,
    });
  });

  it('총 소요시간을 계산한다', () => {
    const transitions = [
      { fromStatus: 'To Do', toStatus: 'In Progress', transitionedAt: '2026-02-01T09:00:00.000+0900', durationMs: null },
      { fromStatus: 'In Progress', toStatus: 'Done', transitionedAt: '2026-02-05T09:00:00.000+0900', durationMs: 4 * 24 * 3600_000 },
    ];
    const result = analyzeStatusTransitions(transitions, 'Done');
    expect(result.totalDurationMs).toBe(4 * 24 * 3600_000);
  });

  it('단일 전환이면 병목이 없다 (durationMs가 null)', () => {
    const transitions = [
      { fromStatus: 'To Do', toStatus: 'In Progress', transitionedAt: '2026-02-01T09:00:00.000+0900', durationMs: null },
    ];
    const result = analyzeStatusTransitions(transitions, 'In Progress');
    expect(result.bottleneck).toBeNull();
    expect(result.totalDurationMs).toBe(0);
  });
});

describe('formatTransitionDuration', () => {
  it('1분 미만은 "1분 미만"을 반환한다', () => {
    expect(formatTransitionDuration(30_000)).toBe('1분 미만');
  });

  it('분 단위를 표시한다', () => {
    expect(formatTransitionDuration(45 * 60_000)).toBe('45분');
  });

  it('시간 + 분을 표시한다', () => {
    expect(formatTransitionDuration((3 * 60 + 20) * 60_000)).toBe('3시간 20분');
  });

  it('정확한 시간은 분을 생략한다', () => {
    expect(formatTransitionDuration(5 * 3600_000)).toBe('5시간');
  });

  it('일 + 시간을 표시한다', () => {
    expect(formatTransitionDuration((2 * 24 + 3) * 3600_000)).toBe('2일 3시간');
  });

  it('정확한 일수는 시간을 생략한다', () => {
    expect(formatTransitionDuration(7 * 24 * 3600_000)).toBe('7일');
  });

  it('음수는 "0분"을 반환한다', () => {
    expect(formatTransitionDuration(-1000)).toBe('0분');
  });
});
