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
