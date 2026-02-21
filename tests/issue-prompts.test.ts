import { describe, it, expect } from 'vitest';
import type { NormalizedIssue } from '../src/main/schemas/storage.schema';
import { getDescriptionTemplate, buildPrompt } from '../src/renderer/utils/issue-prompts';
import { downloadIssueJson } from '../src/renderer/utils/download';

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

describe('프롬프트 생성', () => {
  it('getDescriptionTemplate는 bug 타입에 맞는 템플릿을 반환한다', () => {
    const template = getDescriptionTemplate('Bug');
    expect(template).toContain('현상');
    expect(template).toContain('재현 순서');
    expect(template).toContain('완료 조건');
  });

  it('getDescriptionTemplate는 epic 타입에 맞는 템플릿을 반환한다', () => {
    const template = getDescriptionTemplate('Epic');
    expect(template).toContain('목표');
    expect(template).toContain('범위');
    expect(template).toContain('성공 기준');
  });

  it('getDescriptionTemplate는 task 타입에 맞는 템플릿을 반환한다', () => {
    const template = getDescriptionTemplate('Task');
    expect(template).toContain('목적');
    expect(template).toContain('작업 내용');
  });

  it('getDescriptionTemplate는 sub-task 타입에 맞는 템플릿을 반환한다', () => {
    const template = getDescriptionTemplate('Sub-Task');
    expect(template).toContain('작업 내용');
    expect(template).toContain('완료 조건');
  });

  it('getDescriptionTemplate는 story를 기본 템플릿으로 반환한다', () => {
    const template = getDescriptionTemplate('Story');
    expect(template).toContain('배경');
    expect(template).toContain('요구사항');
  });

  it('buildPrompt는 이슈 정보가 포함된 프롬프트를 생성한다', () => {
    const issue = makeIssue({
      key: 'PROJ-1',
      summary: '테스트 이슈',
      issueType: 'Task',
      status: 'In Progress',
      statusCategory: 'indeterminate',
      priority: 'High',
      assignee: 'Alice',
    });
    const prompt = buildPrompt(issue);
    expect(prompt).toContain('PROJ-1');
    expect(prompt).toContain('테스트 이슈');
    expect(prompt).toContain('Task');
    expect(prompt).toContain('In Progress');
    expect(prompt).toContain('High');
    expect(prompt).toContain('Alice');
    expect(prompt).toContain('라벨 정의');
    expect(prompt).toContain('요청사항');
  });

  it('buildPrompt는 description이 없으면 "(설명 없음)"을 포함한다', () => {
    const issue = makeIssue({ key: 'PROJ-2', description: null });
    const prompt = buildPrompt(issue);
    expect(prompt).toContain('(설명 없음)');
  });

  it('buildPrompt는 선택적 필드가 있을 때 포함한다', () => {
    const issue = makeIssue({
      key: 'PROJ-3',
      sprint: 'Sprint 5',
      labels: ['FE-Feature', 'FE-Stability'],
      components: ['web-app'],
      parent: 'PROJ-1',
      subtasks: ['PROJ-4', 'PROJ-5'],
      dueDate: '2025-03-01',
    });
    const prompt = buildPrompt(issue);
    expect(prompt).toContain('Sprint 5');
    expect(prompt).toContain('FE-Feature, FE-Stability');
    expect(prompt).toContain('web-app');
    expect(prompt).toContain('PROJ-1');
    expect(prompt).toContain('PROJ-4, PROJ-5');
    expect(prompt).toContain('2025-03-01');
  });

  it('downloadIssueJson은 export 가능한 함수이다', () => {
    expect(typeof downloadIssueJson).toBe('function');
  });
});
