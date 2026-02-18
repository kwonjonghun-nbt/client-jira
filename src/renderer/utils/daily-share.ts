import { format, addDays, parseISO, differenceInCalendarDays } from 'date-fns';
import { NormalizedIssue } from '../types/jira.types';

export interface DailyShareCategories {
  inProgress: NormalizedIssue[];
  dueToday: NormalizedIssue[];
  overdue: NormalizedIssue[];
  atRisk: NormalizedIssue[];
}

// ─── Slide types for visual presenter ────────────────────────────────────────

export interface TimelineItem {
  key: string;
  summary: string;
  status: string;
  priority: string | null;
  storyPoints: number | null;
  startDate: string;
  dueDate: string | null;
  daysRemaining: number | null;
}

export interface TicketCardItem {
  key: string;
  summary: string;
  status: string;
  priority: string | null;
  dueDate: string | null;
  delayDays?: number;
}

export interface OverviewSlideData {
  assignee: string;
  date: string;
  counts: { inProgress: number; dueToday: number; overdue: number; atRisk: number };
  total: number;
}

export interface TimelineSlideData {
  issues: TimelineItem[];
}

export interface TicketSlideData {
  category: 'dueToday' | 'overdue' | 'atRisk';
  label: string;
  severity: 'info' | 'warning' | 'danger';
  issues: TicketCardItem[];
}

export interface SummarySlideData {
  total: number;
  counts: { inProgress: number; dueToday: number; overdue: number; atRisk: number };
  highlights: string[];
}

export type DailyShareSlide =
  | { type: 'overview'; title: string; data: OverviewSlideData }
  | { type: 'timeline'; title: string; data: TimelineSlideData }
  | { type: 'tickets'; title: string; data: TicketSlideData }
  | { type: 'summary'; title: string; data: SummarySlideData };

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
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

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
  const today = format(new Date(), 'yyyy-MM-dd');

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
 * 카테고리 데이터를 발표 대본 형식의 마크다운으로 변환 (AI 없이)
 */
export function buildDailyShareMarkdown(
  assignee: string,
  categories: DailyShareCategories
): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  const target = assignee === '전체' ? '전체 팀원' : assignee;
  const lines: string[] = [];

  lines.push(`# ${target} 일일 이슈 공유`);
  lines.push('');
  lines.push(`> ${today} 기준`);
  lines.push('');

  // 진행 현황
  lines.push(`## 진행 현황`);
  lines.push('');
  if (categories.inProgress.length === 0) {
    lines.push('현재 진행중인 작업은 없습니다.');
  } else {
    lines.push(`현재 **${categories.inProgress.length}건**의 작업을 진행하고 있습니다.`);
    lines.push('');
    for (const i of categories.inProgress) {
      const sp = i.storyPoints ? ` (${i.storyPoints}SP)` : '';
      const pri = i.priority ? ` — 우선순위 ${i.priority}` : '';
      lines.push(`- **${i.key}** ${i.summary}${sp}${pri}`);
      lines.push(`  - 현재 상태: ${i.status}`);
    }
  }
  lines.push('');

  // 오늘 완료 예정
  lines.push(`## 오늘 완료 예정`);
  lines.push('');
  if (categories.dueToday.length === 0) {
    lines.push('오늘 마감 예정인 작업은 없습니다.');
  } else {
    lines.push(`오늘 마감인 작업이 **${categories.dueToday.length}건** 있습니다.`);
    lines.push('');
    for (const i of categories.dueToday) {
      const pri = i.priority ? ` — 우선순위 ${i.priority}` : '';
      lines.push(`- **${i.key}** ${i.summary}${pri}`);
      lines.push(`  - 현재 상태: ${i.status}`);
    }
  }
  lines.push('');

  // 지연 이슈
  lines.push(`## 지연 이슈`);
  lines.push('');
  if (categories.overdue.length === 0) {
    lines.push('지연된 작업은 없습니다.');
  } else {
    lines.push(`마감일이 지난 작업이 **${categories.overdue.length}건** 있어 확인이 필요합니다.`);
    lines.push('');
    for (const i of categories.overdue) {
      const delayDays = differenceInCalendarDays(parseISO(today), parseISO(i.dueDate!));
      const pri = i.priority ? ` — 우선순위 ${i.priority}` : '';
      lines.push(`- **${i.key}** ${i.summary}${pri}`);
      lines.push(`  - 마감일 ${i.dueDate!.slice(0, 10)}로부터 **${delayDays}일 지연**, 현재 상태: ${i.status}`);
    }
  }
  lines.push('');

  // 리스크 이슈
  lines.push(`## 리스크 이슈`);
  lines.push('');
  if (categories.atRisk.length === 0) {
    lines.push('주의가 필요한 리스크 이슈는 없습니다.');
  } else {
    lines.push(`내일 마감이지만 아직 리뷰 단계에 진입하지 못한 작업이 **${categories.atRisk.length}건** 있습니다.`);
    lines.push('');
    for (const i of categories.atRisk) {
      const pri = i.priority ? ` — 우선순위 ${i.priority}` : '';
      lines.push(`- **${i.key}** ${i.summary}${pri}`);
      lines.push(`  - 마감일 ${i.dueDate!.slice(0, 10)}, 현재 상태: ${i.status}`);
    }
  }
  lines.push('');

  // 요약
  const total = new Set([
    ...categories.inProgress.map((i) => i.key),
    ...categories.dueToday.map((i) => i.key),
    ...categories.overdue.map((i) => i.key),
    ...categories.atRisk.map((i) => i.key),
  ]).size;
  lines.push('## 요약');
  lines.push('');
  lines.push(`${target}의 오늘 업무 현황을 정리하면, 총 **${total}건**의 관련 이슈가 있습니다.`);
  lines.push(`진행중 ${categories.inProgress.length}건, 오늘 마감 ${categories.dueToday.length}건, 지연 ${categories.overdue.length}건, 리스크 ${categories.atRisk.length}건입니다.`);
  if (categories.overdue.length > 0) {
    lines.push(`특히 지연 이슈 **${categories.overdue.length}건**에 대한 확인이 필요합니다.`);
  }
  if (categories.atRisk.length > 0) {
    lines.push(`리스크 이슈 **${categories.atRisk.length}건**은 내일 마감이므로 우선적으로 리뷰 진입이 필요합니다.`);
  }

  return lines.join('\n');
}

/**
 * 전체 팀원의 마크다운을 담당자별로 합산
 */
export function buildMultiAssigneeDailyShareMarkdown(
  issues: NormalizedIssue[],
  assignees: string[]
): string {
  const sections: string[] = [];

  for (const name of assignees) {
    const cats = categorizeDailyIssues(issues, name);
    const hasIssues = cats.inProgress.length + cats.dueToday.length + cats.overdue.length + cats.atRisk.length > 0;
    if (!hasIssues) continue;
    sections.push(buildDailyShareMarkdown(name, cats));
  }

  return sections.join('\n\n---\n\n');
}

/**
 * DailyShareCategories → 시각적 프레젠터용 슬라이드 배열로 변환
 */
export function buildDailyShareSlides(
  assignee: string,
  categories: DailyShareCategories,
): DailyShareSlide[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDate = new Date();
  const target = assignee === '전체' ? '전체 팀원' : assignee;

  const counts = {
    inProgress: categories.inProgress.length,
    dueToday: categories.dueToday.length,
    overdue: categories.overdue.length,
    atRisk: categories.atRisk.length,
  };
  const total = new Set([
    ...categories.inProgress.map((i) => i.key),
    ...categories.dueToday.map((i) => i.key),
    ...categories.overdue.map((i) => i.key),
    ...categories.atRisk.map((i) => i.key),
  ]).size;

  const slides: DailyShareSlide[] = [];

  // 1. 개요 슬라이드 (항상)
  slides.push({
    type: 'overview',
    title: `${target} 일일 이슈 공유`,
    data: { assignee: target, date: today, counts, total },
  });

  // 2. 타임라인 슬라이드 (진행중 이슈가 있을 때)
  if (categories.inProgress.length > 0) {
    slides.push({
      type: 'timeline',
      title: '진행 현황',
      data: {
        issues: categories.inProgress.map((issue) => {
          const dueNorm = normalizeDate(issue.dueDate);
          const daysRemaining = dueNorm
            ? differenceInCalendarDays(parseISO(dueNorm), todayDate)
            : null;
          return {
            key: issue.key,
            summary: issue.summary,
            status: issue.status,
            priority: issue.priority,
            storyPoints: issue.storyPoints,
            startDate: issue.startDate ?? issue.created,
            dueDate: issue.dueDate,
            daysRemaining,
          };
        }),
      },
    });
  }

  // 3. 티켓 카드 슬라이드들 (비어있지 않은 카테고리만)
  const ticketCategories: {
    key: 'dueToday' | 'overdue' | 'atRisk';
    label: string;
    severity: 'info' | 'warning' | 'danger';
  }[] = [
    { key: 'dueToday', label: '오늘 완료 예정', severity: 'info' },
    { key: 'overdue', label: '지연 이슈', severity: 'danger' },
    { key: 'atRisk', label: '리스크 이슈', severity: 'warning' },
  ];

  for (const cat of ticketCategories) {
    const issues = categories[cat.key];
    if (issues.length === 0) continue;

    slides.push({
      type: 'tickets',
      title: cat.label,
      data: {
        category: cat.key,
        label: cat.label,
        severity: cat.severity,
        issues: issues.map((issue) => {
          const item: TicketCardItem = {
            key: issue.key,
            summary: issue.summary,
            status: issue.status,
            priority: issue.priority,
            dueDate: issue.dueDate,
          };
          if (cat.key === 'overdue' && issue.dueDate) {
            item.delayDays = differenceInCalendarDays(
              todayDate,
              parseISO(normalizeDate(issue.dueDate)!),
            );
          }
          return item;
        }),
      },
    });
  }

  // 4. 요약 슬라이드 (항상)
  const highlights: string[] = [];
  if (counts.inProgress > 0) {
    highlights.push(`현재 ${counts.inProgress}건의 작업이 진행중입니다.`);
  }
  if (counts.dueToday > 0) {
    highlights.push(`오늘 마감 예정 작업이 ${counts.dueToday}건 있습니다.`);
  }
  if (counts.overdue > 0) {
    highlights.push(`지연 이슈 ${counts.overdue}건에 대한 즉각적인 확인이 필요합니다.`);
  }
  if (counts.atRisk > 0) {
    highlights.push(`리스크 이슈 ${counts.atRisk}건은 내일 마감이므로 리뷰 진입이 시급합니다.`);
  }

  slides.push({
    type: 'summary',
    title: '요약',
    data: { total, counts, highlights },
  });

  return slides;
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
