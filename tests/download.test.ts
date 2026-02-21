// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadIssueJson } from '../src/renderer/utils/download';
import type { NormalizedIssue } from '../src/renderer/types/jira.types';

function makeIssue(overrides: Partial<NormalizedIssue> & { key: string }): NormalizedIssue {
  return {
    summary: 'Test issue',
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
    ...overrides,
  };
}

describe('downloadIssueJson', () => {
  let mockClick: ReturnType<typeof vi.fn>;
  let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockClick = vi.fn();
    mockAnchor = { href: '', download: '', click: mockClick };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    mockRevokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    });
    vi.stubGlobal(
      'Blob',
      class MockBlob {
        content: unknown[];
        options: unknown;
        constructor(content: unknown[], options?: unknown) {
          this.content = content;
          this.options = options;
        }
      },
    );
  });

  it('JSON 파일을 다운로드한다', () => {
    const issue = makeIssue({ key: 'TEST-1' });

    downloadIssueJson(issue);

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockAnchor.href).toBe('blob:mock-url');
    expect(mockClick).toHaveBeenCalledOnce();
  });

  it('파일명이 이슈 키 기반이다', () => {
    const issue = makeIssue({ key: 'PROJ-42' });

    downloadIssueJson(issue);

    expect(mockAnchor.download).toBe('PROJ-42.json');
  });

  it('Blob에 JSON 문자열을 전달한다', () => {
    const issue = makeIssue({ key: 'TEST-2', summary: 'My summary' });
    const expectedJson = JSON.stringify(issue, null, 2);

    downloadIssueJson(issue);

    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
    const blobArg = mockCreateObjectURL.mock.calls[0][0] as { content: string[] };
    expect(blobArg.content[0]).toBe(expectedJson);
  });

  it('Blob MIME 타입이 application/json이다', () => {
    const issue = makeIssue({ key: 'TEST-3' });

    downloadIssueJson(issue);

    const blobArg = mockCreateObjectURL.mock.calls[0][0] as { options: { type: string } };
    expect(blobArg.options).toEqual({ type: 'application/json' });
  });

  it('다운로드 후 URL을 해제한다', () => {
    const issue = makeIssue({ key: 'TEST-4' });

    downloadIssueJson(issue);

    expect(mockRevokeObjectURL).toHaveBeenCalledOnce();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('이슈 키에 특수문자가 있어도 동작한다', () => {
    const issue = makeIssue({ key: 'PROJ-123' });

    downloadIssueJson(issue);

    expect(mockAnchor.download).toBe('PROJ-123.json');
    expect(mockClick).toHaveBeenCalledOnce();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
