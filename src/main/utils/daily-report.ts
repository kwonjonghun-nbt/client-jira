import { format } from 'date-fns';
import type { NormalizedIssue } from '../schemas/storage.schema';

/** 오늘 날짜 기준으로 이슈 필터링 (updated 기준) */
export function filterIssuesToday(issues: NormalizedIssue[], dateStr: string): NormalizedIssue[] {
  return issues.filter((issue) => issue.updated.slice(0, 10) === dateStr);
}

/** 담당자별로 이슈 그룹핑 */
export function groupByAssignee(issues: NormalizedIssue[]): Map<string, NormalizedIssue[]> {
  const map = new Map<string, NormalizedIssue[]>();
  for (const issue of issues) {
    const assignee = issue.assignee ?? '미지정';
    const list = map.get(assignee) ?? [];
    list.push(issue);
    map.set(assignee, list);
  }
  return map;
}

/** 일일 공유 리포트용 AI 프롬프트 생성 */
export function buildDailyReportPrompt(assignee: string, dateStr: string): string {
  return `아래 Jira 이슈 데이터를 분석하여 "${assignee}"의 일일 업무 공유 리포트를 작성해주세요.

## 입력 정보
- 날짜: ${dateStr}
- 담당자: ${assignee}

## 리포트 형식

# ${assignee} 일일 업무 공유 (${dateStr})

## 오늘 진행한 작업
- 각 이슈의 제목과 설명을 읽고, 실제로 어떤 작업을 했는지 간결하게 서술
- 관련 티켓 키를 괄호로 표기 (예: PROJ-123)
- 상태 변경이 있었다면 명시 (예: 진행중 → 완료)

## 현재 진행 중인 작업
- 아직 완료되지 않은 이슈 목록과 진행 상황

## 이슈/블로커
- 지연되거나 막힌 이슈가 있다면 기술

## 내일 계획
- 진행 중인 이슈 기반으로 내일 할 작업 추정

---

## 작성 규칙
1. 간결하고 핵심만 전달 (슬랙 공유용)
2. 티켓 제목과 설명을 반드시 읽고 실제 작업 내용 파악
3. 전체 분량은 슬랙 메시지로 읽기 편한 수준 (500자 내외)
4. 결과물은 순수 마크다운만 출력`;
}

/** 슬랙 전송용으로 마크다운 포맷팅 */
export function formatReportForSlack(markdown: string, assignee: string, dateStr: string): string {
  // 슬랙 mrkdwn: # 헤딩 → *볼드*, ## → *볼드*
  const slackText = markdown
    .replace(/^### (.+)$/gm, '*$1*')
    .replace(/^## (.+)$/gm, '*$1*')
    .replace(/^# (.+)$/gm, '*$1*');

  return slackText;
}

/** 이슈 데이터를 AI 프롬프트에 첨부할 JSON으로 변환 */
export function buildIssueDataForPrompt(issues: NormalizedIssue[]): string {
  const data = issues.map((issue) => ({
    key: issue.key,
    summary: issue.summary,
    description: issue.description ?? null,
    status: issue.status,
    statusCategory: issue.statusCategory,
    assignee: issue.assignee,
    priority: issue.priority,
    issueType: issue.issueType,
    labels: issue.labels,
    created: issue.created,
    updated: issue.updated,
  }));
  return JSON.stringify(data, null, 2);
}

/** 오늘 날짜 문자열 반환 (YYYY-MM-DD) */
export function getTodayDateStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * 담당자의 진행중 작업을 컴포넌트 → 에픽 → 하위작업 구조로 슬랙 메시지 생성
 *
 * 규칙:
 * - 진행중(statusCategory === 'indeterminate') 이슈만 포함
 * - 컴포넌트별 그룹핑, 에픽 하위에 작업 티켓 리스트
 * - 진행중 하위작업이 없는 에픽은 생략
 * - 티켓 번호에 Jira 링크 포함
 */
export function buildStructuredReport(
  assignee: string,
  allIssues: NormalizedIssue[],
  baseUrl: string,
): string {
  const issueMap = new Map<string, NormalizedIssue>();
  for (const issue of allIssues) {
    issueMap.set(issue.key, issue);
  }

  const isEpic = (issue: NormalizedIssue) =>
    issue.issueType === 'Epic' || issue.issueType === '에픽';

  // 담당자의 진행중 작업 (에픽 제외)
  const inProgressTasks = allIssues.filter(
    (issue) =>
      issue.assignee === assignee &&
      issue.statusCategory === 'indeterminate' &&
      !isEpic(issue),
  );

  if (inProgressTasks.length === 0) return '';

  // parent 체인을 타고 올라가서 에픽을 찾는다 (Epic → Story → Task 구조 대응)
  const findEpic = (issue: NormalizedIssue): NormalizedIssue | null => {
    let current = issue;
    const visited = new Set<string>();
    while (current.parent) {
      if (visited.has(current.parent)) break; // 순환 방지
      visited.add(current.parent);
      const parent = issueMap.get(current.parent);
      if (!parent) break;
      if (isEpic(parent)) return parent;
      current = parent;
    }
    return null;
  };

  // 에픽별 그룹핑
  const epicTaskMap = new Map<string, NormalizedIssue[]>();
  const noEpicTasks: NormalizedIssue[] = [];

  for (const task of inProgressTasks) {
    const epic = findEpic(task);
    if (epic) {
      const list = epicTaskMap.get(epic.key) ?? [];
      list.push(task);
      epicTaskMap.set(epic.key, list);
    } else {
      noEpicTasks.push(task);
    }
  }

  // 컴포넌트별 그룹핑
  interface EpicGroup {
    epic: NormalizedIssue;
    tasks: NormalizedIssue[];
  }

  const componentMap = new Map<string, EpicGroup[]>();
  const jiraUrl = baseUrl.replace(/\/$/, '');

  const addToComponent = (componentName: string, epicGroup: EpicGroup) => {
    const list = componentMap.get(componentName) ?? [];
    // 같은 에픽이 이미 있으면 머지
    const existing = list.find((g) => g.epic.key === epicGroup.epic.key);
    if (existing) {
      existing.tasks.push(...epicGroup.tasks);
    } else {
      list.push(epicGroup);
    }
    componentMap.set(componentName, list);
  };

  for (const [epicKey, tasks] of epicTaskMap) {
    const epic = issueMap.get(epicKey)!;
    const components = epic.components.length > 0 ? epic.components : ['기타'];
    for (const comp of components) {
      addToComponent(comp, { epic, tasks: [...tasks] });
    }
  }

  // 에픽 없는 작업도 컴포넌트별로
  for (const task of noEpicTasks) {
    const components = task.components.length > 0 ? task.components : ['기타'];
    for (const comp of components) {
      const list = componentMap.get(comp) ?? [];
      // 에픽 없는 작업은 가짜 그룹으로
      list.push({ epic: task, tasks: [] });
      componentMap.set(comp, list);
    }
  }

  const makeLink = (key: string) => `<${jiraUrl}/browse/${key}|${key}>`;

  const lines: string[] = [`*${assignee}*`, ''];

  // 컴포넌트 정렬 (기타는 마지막)
  const sortedComponents = [...componentMap.keys()].sort((a, b) => {
    if (a === '기타') return 1;
    if (b === '기타') return -1;
    return a.localeCompare(b);
  });

  for (const comp of sortedComponents) {
    const epicGroups = componentMap.get(comp)!;
    lines.push(`*${comp}*`);

    for (const { epic, tasks } of epicGroups) {
      if (tasks.length > 0) {
        // 에픽 + 하위 작업
        lines.push(`  ${makeLink(epic.key)} ${epic.summary}`);
        for (const task of tasks) {
          lines.push(`    • ${makeLink(task.key)} ${task.summary} (${task.status})`);
        }
      } else {
        // 에픽 없는 단독 작업
        lines.push(`  • ${makeLink(epic.key)} ${epic.summary} (${epic.status})`);
      }
    }

    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
