import { describe, it, expect } from 'vitest';
import {
  OKRDataSchema,
  NormalizedIssueSchema,
  StoredDataSchema,
  ChangelogEntrySchema,
  LabelNoteSchema,
} from '../src/main/schemas/storage.schema';

describe('OKRDataSchema', () => {
  it('유효한 OKR 데이터를 파싱한다', () => {
    const data = {
      objectives: [{ id: 'o1', title: 'Obj 1', order: 0 }],
      keyResults: [{ id: 'kr1', objectiveId: 'o1', title: 'KR 1', order: 0 }],
      virtualTickets: [{
        id: 'vt1',
        title: 'Virtual Task',
        issueType: 'task',
        createdAt: '2025-01-01T00:00:00Z',
      }],
      links: [{
        id: 'l1',
        keyResultId: 'kr1',
        type: 'jira',
        issueKey: 'PROJ-1',
        order: 0,
        x: 16,
        y: 16,
      }],
      groups: [{
        id: 'g1',
        keyResultId: 'kr1',
        title: 'Group 1',
        order: 0,
        x: 0,
        y: 0,
        w: 320,
        h: 200,
      }],
      relations: [{
        id: 'r1',
        fromLinkId: 'l1',
        toLinkId: 'l2',
      }],
      updatedAt: '2025-01-01T00:00:00Z',
    };

    const result = OKRDataSchema.parse(data);

    expect(result.objectives).toHaveLength(1);
    expect(result.keyResults).toHaveLength(1);
    expect(result.links).toHaveLength(1);
    expect(result.groups).toHaveLength(1);
    expect(result.relations).toHaveLength(1);
  });

  it('groups와 relations이 없으면 빈 배열로 기본값이 적용된다', () => {
    const data = {
      objectives: [],
      keyResults: [],
      virtualTickets: [],
      links: [],
      updatedAt: '2025-01-01T00:00:00Z',
    };

    const result = OKRDataSchema.parse(data);

    expect(result.groups).toEqual([]);
    expect(result.relations).toEqual([]);
  });

  it('필수 필드가 없으면 에러를 발생시킨다', () => {
    expect(() => OKRDataSchema.parse({})).toThrow();
    expect(() => OKRDataSchema.parse({ objectives: [] })).toThrow();
  });

  it('link type이 jira 또는 virtual이어야 한다', () => {
    const data = {
      objectives: [],
      keyResults: [],
      virtualTickets: [],
      links: [{
        id: 'l1',
        keyResultId: 'kr1',
        type: 'invalid',
        order: 0,
      }],
      updatedAt: '2025-01-01T00:00:00Z',
    };

    expect(() => OKRDataSchema.parse(data)).toThrow();
  });
});

describe('NormalizedIssueSchema', () => {
  const validIssue = {
    key: 'PROJ-1',
    summary: 'Test',
    description: null,
    status: 'To Do',
    statusCategory: 'new',
    assignee: null,
    reporter: null,
    priority: 'Medium',
    issueType: 'Task',
    storyPoints: null,
    sprint: null,
    labels: [],
    components: [],
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z',
    startDate: null,
    dueDate: null,
    resolution: null,
    timeTracking: null,
    parent: null,
    subtasks: [],
    issueLinks: [],
  };

  it('유효한 이슈를 파싱한다', () => {
    const result = NormalizedIssueSchema.parse(validIssue);
    expect(result.key).toBe('PROJ-1');
  });

  it('필수 필드가 없으면 에러를 발생시킨다', () => {
    expect(() => NormalizedIssueSchema.parse({ key: 'PROJ-1' })).toThrow();
  });

  it('issueLinks의 direction은 inward 또는 outward여야 한다', () => {
    expect(() =>
      NormalizedIssueSchema.parse({
        ...validIssue,
        issueLinks: [{ type: 'Blocks', direction: 'invalid', linkedIssueKey: 'X-1' }],
      }),
    ).toThrow();
  });
});

describe('StoredDataSchema', () => {
  it('유효한 저장 데이터를 파싱한다', () => {
    const data = {
      syncedAt: '2025-01-01T00:00:00Z',
      source: { baseUrl: 'https://jira.example.com', projects: ['PROJ'] },
      issues: [],
      totalCount: 0,
    };

    const result = StoredDataSchema.parse(data);
    expect(result.totalCount).toBe(0);
  });
});

describe('ChangelogEntrySchema', () => {
  it('유효한 변경 엔트리를 파싱한다', () => {
    const entry = {
      issueKey: 'PROJ-1',
      summary: 'Test',
      changeType: 'status',
      oldValue: 'To Do',
      newValue: 'Done',
      detectedAt: '2025-01-01T00:00:00Z',
    };

    const result = ChangelogEntrySchema.parse(entry);
    expect(result.changeType).toBe('status');
  });

  it('잘못된 changeType은 에러를 발생시킨다', () => {
    expect(() =>
      ChangelogEntrySchema.parse({
        issueKey: 'PROJ-1',
        summary: 'Test',
        changeType: 'invalid',
        oldValue: null,
        newValue: null,
        detectedAt: '2025-01-01T00:00:00Z',
      }),
    ).toThrow();
  });
});

describe('LabelNoteSchema', () => {
  it('유효한 라벨 메모를 파싱한다', () => {
    const result = LabelNoteSchema.parse({
      label: 'FE-Feature',
      description: '새 기능 개발',
      updatedAt: '2025-01-01T00:00:00Z',
    });

    expect(result.label).toBe('FE-Feature');
  });
});
