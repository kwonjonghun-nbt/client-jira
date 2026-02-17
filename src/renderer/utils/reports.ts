import { uniq } from 'es-toolkit';
import type { NormalizedIssue } from '../types/jira.types';
import { format, parseISO, subDays } from 'date-fns';
import { formatDateISO } from './dashboard';

/** Format ISO date string to display format (YYYY-MM-DD HH:MM) */
export function formatReportDate(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM-dd HH:mm');
}

/** Inline markdown formatting (bold, code) */
export function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-gray-100 text-red-600 rounded text-xs">$1</code>');
}

/** Simple markdown to HTML converter */
export function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inTable = false;
  let inBlockquote = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // frontmatter 스킵
    if (i === 0 && line.trim() === '---') {
      while (++i < lines.length && lines[i].trim() !== '---') {
        // skip
      }
      continue;
    }

    // blockquote 끝
    if (inBlockquote && !line.startsWith('>')) {
      html.push('</blockquote>');
      inBlockquote = false;
    }

    // 테이블 끝
    if (inTable && !line.startsWith('|')) {
      html.push('</tbody></table>');
      inTable = false;
    }

    // 빈 줄
    if (line.trim() === '') {
      html.push('<br/>');
      continue;
    }

    // 수평선
    if (/^---+$/.test(line.trim())) {
      html.push('<hr class="my-3 border-gray-200"/>');
      continue;
    }

    // 헤딩
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = inlineFormat(headingMatch[2]);
      const classes: Record<number, string> = {
        1: 'text-xl font-bold text-gray-900 mt-6 mb-3',
        2: 'text-lg font-bold text-gray-800 mt-5 mb-2',
        3: 'text-base font-semibold text-gray-700 mt-4 mb-2',
        4: 'text-sm font-semibold text-gray-600 mt-3 mb-1',
      };
      html.push(`<h${level} class="${classes[level] ?? ''}">${text}</h${level}>`);
      continue;
    }

    // blockquote
    if (line.startsWith('>')) {
      if (!inBlockquote) {
        html.push('<blockquote class="border-l-4 border-blue-300 pl-4 py-1 my-2 text-sm text-gray-600 bg-blue-50 rounded-r">');
        inBlockquote = true;
      }
      html.push(`<p>${inlineFormat(line.slice(1).trim())}</p>`);
      continue;
    }

    // 테이블
    if (line.startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      // 구분선 행 (|---|---|) 스킵
      if (cells.every((c) => /^[-:]+$/.test(c))) continue;

      if (!inTable) {
        inTable = true;
        html.push('<table class="w-full text-sm my-2 border-collapse">');
        html.push(`<thead><tr class="border-b border-gray-200 bg-gray-50">${cells.map((c) => `<th class="text-left px-3 py-1.5 text-xs font-medium text-gray-500">${inlineFormat(c)}</th>`).join('')}</tr></thead><tbody>`);
      } else {
        html.push(`<tr class="border-b border-gray-100">${cells.map((c) => `<td class="px-3 py-1.5 text-gray-700">${inlineFormat(c)}</td>`).join('')}</tr>`);
      }
      continue;
    }

    // 리스트
    const listMatch = line.match(/^(\s*)[-*]\s+(.+)/);
    if (listMatch) {
      html.push(`<div class="flex gap-2 text-sm text-gray-700 ml-${Math.min(Math.floor(listMatch[1].length / 2) * 4, 12)}"><span class="text-gray-400">•</span><span>${inlineFormat(listMatch[2])}</span></div>`);
      continue;
    }

    // 일반 텍스트
    html.push(`<p class="text-sm text-gray-700 leading-relaxed">${inlineFormat(line)}</p>`);
  }

  if (inTable) html.push('</tbody></table>');
  if (inBlockquote) html.push('</blockquote>');

  return html.join('\n');
}

/** Build the AI report generation prompt */
export function buildReportPrompt(assignee: string, startDate: string, endDate: string): string {
  return `아래 Jira 이슈 데이터를 분석하여 담당자의 업무 성과 리포트를 마크다운 형식으로 작성해주세요.
단순 수치 나열이 아니라, 각 티켓의 제목·설명·라벨·컴포넌트를 꼼꼼히 읽고 "이 사람이 이 기간에 실제로 어떤 일을 했는지"를 서술형으로 분석해주세요.

## 입력 정보
- 기간: ${startDate} ~ ${endDate}
- 담당자: ${assignee}
- 데이터: 아래 "이슈 데이터 다운로드" 버튼으로 다운로드한 JSON 파일을 함께 첨부해주세요

## 라벨 정의

| 라벨 | 의미 |
|------|------|
| FE-Feature | 사용자에게 이전에 없던 새로운 가치나 기능을 제공하는 작업. 신규 메뉴/페이지 개발, 신규 비즈니스 로직 구현, 타 서비스 연동 |
| FE-Maintenance | 기능 추가는 아니지만 서비스 품질 유지를 위해 즉시 대응해야 하는 작업. 문구 수정, 레이아웃 보정, 운영 요청 대응 |
| FE-Refactoring | 다음에 비슷한 기능을 더 빠르고 안전하게 개발할 수 있게 하는 작업. 레거시 코드 삭제, 중복 로직 컴포넌트화, 타입 구체화, 기술 부채 해결 |
| FE-Performance | 사용자가 느끼는 '느림'이나 '답답함'을 해결하는 작업. 로딩 속도 최적화, 렌더링 성능 개선, 번들 사이즈 감소, 이미지 최적화 |
| FE-Stability | 예기치 못한 에러를 방지하거나 장애 발생 시 더 빨리 찾아내기 위한 작업. 테스트 코드 작성, 에러 모니터링, 로그 강화, 보안 패치 |
| FE-DesignSystem | 사용자가 어느 페이지에서든 일관된 디자인과 경험을 느끼게 만드는 작업. 공통 UI 컴포넌트, 디자인 가이드 적용, 테마 대응 |
| FE-Discovery | 미래의 팀원이나 자신의 시간을 아껴주는 조사·기록 작업. 리서치, PoC, 설계, 엔지니어링 문서화, 회의록, 운영 가이드 |
| FE-Growth | 특정 지표(클릭률, 가입률 등)를 높이기 위한 가설 검증 작업. A/B 테스트, 데이터 트래킹, 가입/결제 퍼널 개선 |

## 티켓 상세 정보 기준

좋은 티켓에는 다음 항목들이 포함되어야 합니다:
- **배경(Background)**: 이 작업이 왜 필요한지, 어떤 문제나 요구사항에서 시작되었는지
- **작업 목표(Goal)**: 이 티켓을 통해 달성하려는 구체적인 목표
- **완료 기준(Acceptance Criteria)**: 이 티켓이 "완료"되었다고 판단하는 명확한 기준
- **참고 자료(References)**: 관련 디자인, 문서, 링크 등

## 리포트 형식

# ${assignee} 업무 리포트 (${startDate} ~ ${endDate})

> 기간: ${startDate} ~ ${endDate} | 담당자: ${assignee}

## 1. 수치 요약

| 항목 | 수치 |
|------|------|
| 총 이슈 | N건 |
| 완료 | N건 (%) |
| 미완료 | N건 |
| 총 스토리포인트 | N점 (완료 N점) |

### 이슈타입별
| 타입 | 전체 | 완료 | 완료율 |
|------|------|------|--------|

### 라벨별
| 라벨 | 전체 | 완료 | 완료율 |
|------|------|------|--------|

### 우선순위별
| 우선순위 | 전체 | 완료 | 완료율 |
|----------|------|------|--------|

## 2. 주요 작업 내용

티켓 제목과 설명을 기반으로 이 기간에 수행한 작업을 **카테고리별로 묶어** 서술해주세요.
예시 카테고리: 신규 기능 개발, 버그 수정, 리팩토링, 성능 개선, UI/UX 개선, 인프라/DevOps, 테스트, 문서화 등

각 카테고리마다:
- 어떤 작업들을 했는지 구체적으로 설명
- 관련 티켓 키를 괄호로 표기 (예: PROJ-123)
- 기술적으로 어떤 의미가 있는 작업인지 간단히 해석

## 3. 기술적 성과 분석

이 기간의 작업들을 종합하여:
- **핵심 기술 성과**: 가장 임팩트가 큰 작업 2~3개를 선정하고, 왜 중요한지 설명
- **기술 역량 활용**: 어떤 기술 스택/영역에서 주로 작업했는지 (프론트엔드, 백엔드, DB, 인프라 등)
- **코드 품질 기여**: 리팩토링, 테스트 추가, 기술 부채 해소 등이 있었는지

## 4. 업무 균형 분석

라벨과 이슈타입 분포를 기반으로:
- **집중 영역**: 이 기간에 가장 많은 시간을 투자한 영역
- **상대적 부족 영역**: 신경 쓰지 못한 영역 (예: 기능 개발에 집중했지만 테스트/문서화/리팩토링은 부족)
- **균형 제안**: 다음 기간에 보완하면 좋을 영역

## 5. 미완료·지연 이슈

| 이슈 키 | 제목 | 상태 | 우선순위 | 지연 사유 추정 |
|----------|------|------|----------|----------------|

각 지연 이슈에 대해 어떤 조치가 필요한지 제안해주세요.

## 6. 티켓 품질 점검

### 상세 정보 미흡 티켓
각 티켓의 설명을 확인하여, 위 "티켓 상세 정보 기준"(배경/작업 목표/완료 기준/참고 자료)이 누락되었거나 미흡한 티켓을 나열해주세요.

각 티켓에 대해:
- **이슈 키 / 제목**
- **현재 상태**: 설명에 어떤 내용이 있는지 요약
- **누락 항목**: 배경/작업 목표/완료 기준/참고 자료 중 빠진 것
- **개선 제안**: 어떤 내용을 추가하면 좋을지 구체적으로 제안
- **심각도**: 높음/중간/낮음 (복잡한 작업인데 설명이 없으면 높음, 단순 문구 수정 같은 자명한 티켓은 낮음)

### 라벨 누락 티켓
라벨이 없는 티켓을 찾아 위 "라벨 정의"를 기준으로 적절한 라벨을 추천해주세요.

| 이슈 키 | 제목 | 추천 라벨 | 추천 사유 |
|----------|------|-----------|-----------|

라벨이 여러 개 해당되면 모두 표기해주세요.

### 라벨 분류 적절성 검토
이미 라벨이 있는 티켓 중, 티켓 내용과 라벨이 맞지 않는 경우:

| 이슈 키 | 제목 | 현재 라벨 | 문제점 | 권장 라벨 |
|----------|------|-----------|--------|-----------|

## 7. 총평

5~8문장으로 이 기간의 업무를 종합 평가해주세요:
- 전반적인 생산성과 완성도
- 가장 주목할 성과
- 개선이 필요한 부분
- 티켓 관리 품질에 대한 피드백
- 다음 기간에 대한 제안

---

## 작성 규칙
1. 수치는 정확히 계산하고, 완료율은 소수점 1자리까지 표시
2. 티켓 제목과 설명을 반드시 읽고, 실제 작업 내용을 파악하여 서술
3. 단순 나열이 아닌, 분석과 해석이 담긴 리포트 작성
4. 라벨의 의미를 파악하여 업무 성격을 분류 (위 라벨 정의 참고)
5. 라벨 추천은 반드시 위 라벨 정의에 기반하여 판단
6. 테이블은 마크다운 형식으로 작성
7. 결과물은 .md 파일로 저장할 수 있는 순수 마크다운만 출력`;
}

/** Get default period (today - 7 days) */
export function getDefaultPeriod(): { start: string; end: string } {
  const now = new Date();
  const end = formatDateISO(now);
  const start = format(subDays(now, 7), 'yyyy-MM-dd');
  return { start, end };
}

/** Extract unique assignees from issues */
export function extractAssignees(issues: NormalizedIssue[]): string[] {
  return uniq(issues.map((i) => i.assignee).filter((a): a is string => a != null)).sort();
}

/** Filter issues by period and assignee */
export function filterReportIssues(
  issues: NormalizedIssue[],
  assignee: string,
  startDate: string,
  endDate: string,
): NormalizedIssue[] {
  return issues.filter((issue) => {
    const updated = issue.updated.slice(0, 10);
    const inPeriod = updated >= startDate && updated <= endDate;
    const matchAssignee = assignee === '전체' || issue.assignee === assignee;
    return inPeriod && matchAssignee;
  });
}

/** Build JSON data for download */
export function buildIssueExportData(issues: NormalizedIssue[]) {
  return issues.map((issue) => ({
    key: issue.key,
    summary: issue.summary,
    description: issue.description ?? null,
    status: issue.status,
    statusCategory: issue.statusCategory,
    assignee: issue.assignee,
    priority: issue.priority,
    issueType: issue.issueType,
    storyPoints: issue.storyPoints,
    sprint: issue.sprint,
    labels: issue.labels,
    components: issue.components,
    created: issue.created,
    updated: issue.updated,
    dueDate: issue.dueDate,
    resolution: issue.resolution,
  }));
}
