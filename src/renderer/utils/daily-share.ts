import { NormalizedIssue } from '../types/jira.types';

export interface DailyShareCategories {
  inProgress: NormalizedIssue[];
  dueToday: NormalizedIssue[];
  overdue: NormalizedIssue[];
  atRisk: NormalizedIssue[];
}

/**
 * 날짜 문자열을 YYYY-MM-DD 형식으로 정규화
 */
function normalizeDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return dateStr.slice(0, 10);
}

/**
 * 상태 문자열이 리뷰/QA 단계인지 확인
 */
function isInReviewOrQA(status: string): boolean {
  const lowerStatus = status.toLowerCase();
  return (
    lowerStatus.includes('리뷰') ||
    lowerStatus.includes('review') ||
    lowerStatus.includes('qa')
  );
}

/**
 * 담당자별 오늘의 이슈를 4가지 카테고리로 분류
 * - inProgress: 진행중인 작업
 * - dueToday: 오늘 완료 예정
 * - overdue: 완료일정이 지난 작업
 * - atRisk: 완료일정이 하루 남았는데 아직 리뷰 단계가 아닌 작업
 */
export function categorizeDailyIssues(
  issues: NormalizedIssue[],
  assignee: string
): DailyShareCategories {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const assignedIssues = assignee === '전체'
    ? issues
    : issues.filter((issue) => issue.assignee === assignee);

  const inProgress: NormalizedIssue[] = [];
  const dueToday: NormalizedIssue[] = [];
  const overdue: NormalizedIssue[] = [];
  const atRisk: NormalizedIssue[] = [];

  for (const issue of assignedIssues) {
    const normalizedDueDate = normalizeDate(issue.dueDate);
    const isDone = issue.statusCategory === 'done';
    const isIndeterminate = issue.statusCategory === 'indeterminate';

    // 진행중인 작업
    if (isIndeterminate) {
      inProgress.push(issue);
    }

    // 완료되지 않은 작업만 날짜 기반 분류
    if (!isDone && normalizedDueDate) {
      if (normalizedDueDate === today) {
        // 오늘 완료 예정
        dueToday.push(issue);
      } else if (normalizedDueDate < today) {
        // 완료일정이 지난 작업
        overdue.push(issue);
      } else if (
        normalizedDueDate === tomorrow &&
        !isInReviewOrQA(issue.status)
      ) {
        // 완료일정이 하루 남았는데 아직 리뷰 단계가 아닌 작업
        atRisk.push(issue);
      }
    }
  }

  return {
    inProgress,
    dueToday,
    overdue,
    atRisk,
  };
}

/**
 * AI가 일일 공유 리포트를 생성하기 위한 프롬프트 구성
 */
export function buildDailySharePrompt(
  assignee: string,
  categories: DailyShareCategories
): string {
  const today = new Date().toISOString().slice(0, 10);

  const formatIssues = (issues: NormalizedIssue[]) =>
    issues.map((issue) => ({
      key: issue.key,
      summary: issue.summary,
      status: issue.status,
      priority: issue.priority,
      storyPoints: issue.storyPoints,
      dueDate: issue.dueDate,
    }));

  const target = assignee === '전체' ? '전체 팀원' : assignee;

  return `오늘(${today}) ${target}의 일일 업무 공유 리포트를 생성해주세요.

다음 데이터를 기반으로 팀원들과 공유할 수 있는 마크다운 형식의 리포트를 작성해주세요:

**진행 현황 (${categories.inProgress.length}건)**
${JSON.stringify(formatIssues(categories.inProgress), null, 2)}

**오늘 완료 예정 (${categories.dueToday.length}건)**
${JSON.stringify(formatIssues(categories.dueToday), null, 2)}

**지연 이슈 (${categories.overdue.length}건)**
${JSON.stringify(formatIssues(categories.overdue), null, 2)}

**리스크 이슈 (${categories.atRisk.length}건)**
${JSON.stringify(formatIssues(categories.atRisk), null, 2)}

리포트 작성 가이드:
- 마크다운 형식으로 작성 (## 섹션 제목 사용)
- 섹션: "## 진행 현황", "## 오늘 완료 예정", "## 지연 이슈", "## 리스크 이슈", "## 요약"
- 진행 현황: 현재 작업 중인 이슈 요약
- 오늘 완료 예정: 오늘 마감인 작업 강조
- 지연 이슈: 마감일이 지난 작업의 긴급도 분석
- 리스크 이슈: 내일 마감인데 아직 리뷰 단계가 아닌 작업, 주의 필요
- 요약: 팀원들을 위한 간단한 전체 요약
- 한국어로 작성
- 간결하고 명확하게 작성
- 각 이슈는 키(key), 요약(summary), 우선순위(priority) 정보 포함`;
}

/**
 * 일일 공유 카테고리를 JSON 내보내기 형식으로 변환
 */
export function buildDailyShareExportData(categories: DailyShareCategories): {
  inProgress: unknown[];
  dueToday: unknown[];
  overdue: unknown[];
  atRisk: unknown[];
} {
  const formatIssue = (issue: NormalizedIssue) => ({
    key: issue.key,
    summary: issue.summary,
    status: issue.status,
    statusCategory: issue.statusCategory,
    priority: issue.priority,
    issueType: issue.issueType,
    storyPoints: issue.storyPoints,
    dueDate: issue.dueDate,
    assignee: issue.assignee,
  });

  return {
    inProgress: categories.inProgress.map(formatIssue),
    dueToday: categories.dueToday.map(formatIssue),
    overdue: categories.overdue.map(formatIssue),
    atRisk: categories.atRisk.map(formatIssue),
  };
}
