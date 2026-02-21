import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeIssue, normalizeIssues, _clearAdfCacheForTesting } from '../src/main/utils/normalize';
import type { JiraIssue } from '../src/main/schemas/jira.schema';

function makeJiraIssue(overrides?: Partial<JiraIssue>): JiraIssue {
  return {
    key: 'PROJ-1',
    id: '10001',
    self: 'https://jira.example.com/rest/api/3/issue/10001',
    fields: {
      summary: 'Test summary',
      description: null,
      status: { name: 'To Do', statusCategory: { key: 'new', name: 'To Do' } },
      assignee: null,
      reporter: null,
      priority: { name: 'Medium' },
      issuetype: { name: 'Task' },
      customfield_10016: null,
      customfield_10020: null,
      labels: [],
      components: [],
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
      duedate: null,
      resolution: null,
      timetracking: null,
      parent: null,
      subtasks: [],
      issuelinks: [],
    },
    ...overrides,
  } as JiraIssue;
}

describe('normalizeIssue', () => {
  beforeEach(() => {
    _clearAdfCacheForTesting();
  });
  it('기본 필드를 정규화한다', () => {
    const result = normalizeIssue(makeJiraIssue());

    expect(result.key).toBe('PROJ-1');
    expect(result.summary).toBe('Test summary');
    expect(result.status).toBe('To Do');
    expect(result.statusCategory).toBe('new');
    expect(result.issueType).toBe('Task');
    expect(result.priority).toBe('Medium');
  });

  it('assignee displayName을 추출한다', () => {
    const result = normalizeIssue(makeJiraIssue({
      fields: {
        ...makeJiraIssue().fields,
        assignee: { displayName: 'John Doe', accountId: 'abc', emailAddress: 'john@test.com' } as any,
      },
    }));

    expect(result.assignee).toBe('John Doe');
  });

  it('assignee가 없으면 null이다', () => {
    const result = normalizeIssue(makeJiraIssue());
    expect(result.assignee).toBeNull();
  });

  it('reporter displayName을 추출한다', () => {
    const result = normalizeIssue(makeJiraIssue({
      fields: {
        ...makeJiraIssue().fields,
        reporter: { displayName: 'Jane Smith', accountId: 'xyz', emailAddress: 'jane@test.com' } as any,
      },
    }));

    expect(result.reporter).toBe('Jane Smith');
  });

  it('reporter가 없으면 null이다', () => {
    const result = normalizeIssue(makeJiraIssue());
    expect(result.reporter).toBeNull();
  });

  it('dueDate 마감일을 추출한다', () => {
    const result = normalizeIssue(makeJiraIssue({
      fields: { ...makeJiraIssue().fields, duedate: '2025-12-31' },
    }));

    expect(result.dueDate).toBe('2025-12-31');
  });

  it('duedate가 null이면 null이다', () => {
    const result = normalizeIssue(makeJiraIssue());
    expect(result.dueDate).toBeNull();
  });

  it('ADF description을 플레인 텍스트로 변환한다', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', text: 'World' },
          ],
        },
      ],
    };

    const result = normalizeIssue(makeJiraIssue({
      fields: { ...makeJiraIssue().fields, description: adf as any },
    }));

    expect(result.description).toBe('Hello World');
  });

  it('description이 null이면 null을 반환한다', () => {
    const result = normalizeIssue(makeJiraIssue());
    expect(result.description).toBeNull();
  });

  it('description이 문자열이면 그대로 반환한다 (legacy 호환)', () => {
    const result = normalizeIssue(makeJiraIssue({
      fields: { ...makeJiraIssue().fields, description: 'plain text description' as any },
    }));

    expect(result.description).toBeNull();
  });

  it('description이 빈 ADF이면 빈 문자열 또는 null을 반환한다', () => {
    const emptyAdf = { type: 'doc', version: 1, content: [] };
    const result = normalizeIssue(makeJiraIssue({
      fields: { ...makeJiraIssue().fields, description: emptyAdf as any },
    }));

    expect(result.description === '' || result.description === null).toBe(true);
  });

  it('labels 배열을 그대로 전달한다', () => {
    const result = normalizeIssue(makeJiraIssue({
      fields: { ...makeJiraIssue().fields, labels: ['FE-Feature', 'urgent'] },
    }));

    expect(result.labels).toEqual(['FE-Feature', 'urgent']);
  });

  it('components name을 추출한다', () => {
    const result = normalizeIssue(makeJiraIssue({
      fields: {
        ...makeJiraIssue().fields,
        components: [{ name: 'frontend' }, { name: 'api' }] as any,
      },
    }));

    expect(result.components).toEqual(['frontend', 'api']);
  });

  it('components가 빈 배열이면 빈 배열이다', () => {
    const result = normalizeIssue(makeJiraIssue({
      fields: { ...makeJiraIssue().fields, components: [] as any },
    }));

    expect(result.components).toEqual([]);
  });

  it('활성 스프린트를 우선 추출한다', () => {
    const result = normalizeIssue(makeJiraIssue({
      fields: {
        ...makeJiraIssue().fields,
        customfield_10020: [
          { name: 'Sprint 1', state: 'closed', startDate: '2025-01-01' },
          { name: 'Sprint 2', state: 'active', startDate: '2025-01-15' },
        ] as any,
      },
    }));

    expect(result.sprint).toBe('Sprint 2');
    expect(result.startDate).toBe('2025-01-15');
  });

  it('스프린트가 없으면 null이다', () => {
    const result = normalizeIssue(makeJiraIssue());
    expect(result.sprint).toBeNull();
    expect(result.startDate).toBeNull();
  });

  it('빈 스프린트 배열이면 sprint=null, startDate=null이다', () => {
    const result = normalizeIssue(makeJiraIssue({
      fields: { ...makeJiraIssue().fields, customfield_10020: [] as any },
    }));

    expect(result.sprint).toBeNull();
    expect(result.startDate).toBeNull();
  });

  it('storyPoints를 추출한다', () => {
    const result = normalizeIssue(makeJiraIssue({
      fields: { ...makeJiraIssue().fields, customfield_10016: 5 },
    }));

    expect(result.storyPoints).toBe(5);
  });

  it('storyPoints=0은 유효한 값이다 (null이 아님)', () => {
    const result = normalizeIssue(makeJiraIssue({
      fields: { ...makeJiraIssue().fields, customfield_10016: 0 },
    }));

    expect(result.storyPoints).toBe(0);
  });

  it('resolution을 추출한다', () => {
    const result = normalizeIssue(makeJiraIssue({
      fields: {
        ...makeJiraIssue().fields,
        resolution: { name: 'Done' } as any,
      },
    }));

    expect(result.resolution).toBe('Done');
  });

  it('issueLinks를 direction과 함께 정규화한다', () => {
    const result = normalizeIssue(makeJiraIssue({
      fields: {
        ...makeJiraIssue().fields,
        issuelinks: [
          {
            type: { name: 'Blocks' },
            outwardIssue: { key: 'PROJ-2' },
          },
          {
            type: { name: 'Blocks' },
            inwardIssue: { key: 'PROJ-3' },
          },
        ] as any,
      },
    }));

    expect(result.issueLinks).toHaveLength(2);
    expect(result.issueLinks[0]).toEqual({
      type: 'Blocks',
      direction: 'outward',
      linkedIssueKey: 'PROJ-2',
    });
    expect(result.issueLinks[1]).toEqual({
      type: 'Blocks',
      direction: 'inward',
      linkedIssueKey: 'PROJ-3',
    });
  });

  it('timeTracking을 추출한다', () => {
    const result = normalizeIssue(makeJiraIssue({
      fields: {
        ...makeJiraIssue().fields,
        timetracking: {
          originalEstimate: '2h',
          remainingEstimate: '1h',
          timeSpent: '1h',
        } as any,
      },
    }));

    expect(result.timeTracking).toEqual({
      originalEstimate: '2h',
      remainingEstimate: '1h',
      timeSpent: '1h',
    });
  });

  it('parent와 subtasks를 추출한다', () => {
    const result = normalizeIssue(makeJiraIssue({
      fields: {
        ...makeJiraIssue().fields,
        parent: { key: 'PROJ-0' } as any,
        subtasks: [{ key: 'PROJ-2' }, { key: 'PROJ-3' }] as any,
      },
    }));

    expect(result.parent).toBe('PROJ-0');
    expect(result.subtasks).toEqual(['PROJ-2', 'PROJ-3']);
  });
});

describe('normalizeIssues', () => {
  beforeEach(() => {
    _clearAdfCacheForTesting();
  });
  it('여러 이슈를 일괄 정규화한다', () => {
    const issues = [
      makeJiraIssue({ key: 'PROJ-1' }),
      makeJiraIssue({ key: 'PROJ-2' }),
    ];

    const result = normalizeIssues(issues);

    expect(result).toHaveLength(2);
    expect(result[0].key).toBe('PROJ-1');
    expect(result[1].key).toBe('PROJ-2');
  });

  it('빈 배열이면 빈 배열을 반환한다', () => {
    expect(normalizeIssues([])).toEqual([]);
  });
});
