import { describe, it, expect } from 'vitest';
import { diffIssues } from '../src/main/utils/diff';
import type { NormalizedIssue } from '../src/main/schemas/storage.schema';
import { makeIssue, DETECTED_AT } from './fixtures';

describe('diffIssues', () => {
  it('신규 이슈를 감지한다', () => {
    const prev: NormalizedIssue[] = [];
    const curr = [makeIssue({ key: 'PROJ-1', summary: '새 이슈' })];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      issueKey: 'PROJ-1',
      summary: '새 이슈',
      changeType: 'created',
      oldValue: null,
      newValue: null,
    });
  });

  it('상태 변경을 감지한다', () => {
    const prev = [makeIssue({ key: 'PROJ-1', status: 'To Do' })];
    const curr = [makeIssue({ key: 'PROJ-1', status: 'In Progress' })];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      changeType: 'status',
      oldValue: 'To Do',
      newValue: 'In Progress',
    });
  });

  it('담당자 변경을 감지한다', () => {
    const prev = [makeIssue({ key: 'PROJ-1', assignee: 'Alice' })];
    const curr = [makeIssue({ key: 'PROJ-1', assignee: 'Bob' })];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      changeType: 'assignee',
      oldValue: 'Alice',
      newValue: 'Bob',
    });
  });

  it('우선순위 변경을 감지한다', () => {
    const prev = [makeIssue({ key: 'PROJ-1', priority: 'Low' })];
    const curr = [makeIssue({ key: 'PROJ-1', priority: 'High' })];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      changeType: 'priority',
      oldValue: 'Low',
      newValue: 'High',
    });
  });

  it('스토리포인트 변경을 감지한다', () => {
    const prev = [makeIssue({ key: 'PROJ-1', storyPoints: 3 })];
    const curr = [makeIssue({ key: 'PROJ-1', storyPoints: 5 })];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      changeType: 'storyPoints',
      oldValue: '3',
      newValue: '5',
    });
  });

  it('해결 상태 변경을 감지한다 (미해결 → 해결)', () => {
    const prev = [makeIssue({ key: 'PROJ-1', resolution: null })];
    const curr = [makeIssue({ key: 'PROJ-1', resolution: 'Done' })];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      changeType: 'resolved',
      oldValue: null,
      newValue: 'Done',
    });
  });

  it('이미 해결된 상태에서 resolution이 변경되면 감지하지 않는다', () => {
    const prev = [makeIssue({ key: 'PROJ-1', resolution: 'Done' })];
    const curr = [makeIssue({ key: 'PROJ-1', resolution: 'Won\'t Do' })];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(0);
  });

  it('여러 필드가 동시에 변경되면 각각의 변경을 모두 감지한다', () => {
    const prev = [makeIssue({ key: 'PROJ-1', status: 'To Do', assignee: 'Alice', priority: 'Low' })];
    const curr = [makeIssue({ key: 'PROJ-1', status: 'Done', assignee: 'Bob', priority: 'High' })];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(3);
    const types = entries.map((e) => e.changeType).sort();
    expect(types).toEqual(['assignee', 'priority', 'status']);
  });

  it('변경사항이 없으면 빈 배열을 반환한다', () => {
    const issue = makeIssue({ key: 'PROJ-1' });
    const entries = diffIssues([issue], [issue], DETECTED_AT);

    expect(entries).toHaveLength(0);
  });

  it('여러 이슈에서 변경을 각각 감지한다', () => {
    const prev = [
      makeIssue({ key: 'PROJ-1', status: 'To Do' }),
      makeIssue({ key: 'PROJ-2', status: 'To Do' }),
    ];
    const curr = [
      makeIssue({ key: 'PROJ-1', status: 'In Progress' }),
      makeIssue({ key: 'PROJ-2', status: 'Done' }),
    ];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(2);
    expect(entries[0].issueKey).toBe('PROJ-1');
    expect(entries[1].issueKey).toBe('PROJ-2');
  });

  it('detectedAt이 모든 엔트리에 설정된다', () => {
    const prev: NormalizedIssue[] = [];
    const curr = [makeIssue({ key: 'PROJ-1' }), makeIssue({ key: 'PROJ-2' })];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(2);
    entries.forEach((e) => expect(e.detectedAt).toBe(DETECTED_AT));
  });

  it('prev에만 있는 이슈(삭제된 이슈)는 감지하지 않는다 — 의도적 동작', () => {
    const prev = [makeIssue({ key: 'PROJ-1' })];
    const curr: NormalizedIssue[] = [];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(0);
  });

  it('assignee null → 값 전환을 감지한다', () => {
    const prev = [makeIssue({ key: 'PROJ-1', assignee: null })];
    const curr = [makeIssue({ key: 'PROJ-1', assignee: 'Alice' })];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      changeType: 'assignee',
      oldValue: null,
      newValue: 'Alice',
    });
  });

  it('storyPoints null → 값 전환을 감지한다', () => {
    const prev = [makeIssue({ key: 'PROJ-1', storyPoints: null })];
    const curr = [makeIssue({ key: 'PROJ-1', storyPoints: 5 })];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      changeType: 'storyPoints',
      oldValue: null,
      newValue: '5',
    });
  });

  it('assignee 값 → null 전환을 감지한다', () => {
    const prev = [makeIssue({ key: 'PROJ-1', assignee: 'Alice' })];
    const curr = [makeIssue({ key: 'PROJ-1', assignee: null })];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      changeType: 'assignee',
      oldValue: 'Alice',
      newValue: null,
    });
  });

  it('storyPoints 값 → null 전환을 감지한다', () => {
    const prev = [makeIssue({ key: 'PROJ-1', storyPoints: 5 })];
    const curr = [makeIssue({ key: 'PROJ-1', storyPoints: null })];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      changeType: 'storyPoints',
      oldValue: '5',
      newValue: null,
    });
  });

  it('storyPoints=0은 null과 구분하여 유효한 값으로 처리한다', () => {
    const prev = [makeIssue({ key: 'PROJ-1', storyPoints: null })];
    const curr = [makeIssue({ key: 'PROJ-1', storyPoints: 0 })];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      changeType: 'storyPoints',
      oldValue: null,
      newValue: '0',
    });
  });

  it('prev=[], curr=[] 빈 배열 쌍은 빈 결과를 반환한다', () => {
    const entries = diffIssues([], [], DETECTED_AT);

    expect(entries).toHaveLength(0);
  });

  it('같은 이슈에서 여러 필드 동시 변경과 resolution 변경을 모두 감지한다', () => {
    const prev = [makeIssue({ key: 'PROJ-1', status: 'To Do', assignee: 'Alice', priority: 'Low', storyPoints: 3, resolution: null })];
    const curr = [makeIssue({ key: 'PROJ-1', status: 'Done', assignee: 'Bob', priority: 'High', storyPoints: 8, resolution: 'Fixed' })];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(5);
    const types = entries.map((e) => e.changeType).sort();
    expect(types).toEqual(['assignee', 'priority', 'resolved', 'status', 'storyPoints']);
  });

  it('resolution이 null에서 null이면 변경을 감지하지 않는다', () => {
    const prev = [makeIssue({ key: 'PROJ-1', resolution: null })];
    const curr = [makeIssue({ key: 'PROJ-1', resolution: null })];

    const entries = diffIssues(prev, curr, DETECTED_AT);

    expect(entries).toHaveLength(0);
  });
});
