# 대시보드 페이지

## 개요

동기화된 Jira 이슈의 요약 통계와 변경 추적을 제공하는 메인 대시보드.

## 기능

### 기간·담당자 필터

- 날짜 프리셋 (1주, 2주, 1개월, 3개월, 6개월, 1년)
- 커스텀 날짜 범위 입력
- 담당자 드롭다운 필터
- 필터링된 이슈 건수 표시

### 요약 카드 (4열 그리드)

| 카드 | 내용 |
|------|------|
| 전체 이슈 | 필터된 이슈 총 개수 |
| 진행중 | statusCategory가 `indeterminate`인 이슈 수 |
| 완료 | statusCategory가 `done`인 이슈 수 |
| 미착수 | statusCategory가 `new`인 이슈 수 |

### 오늘의 이슈공유

- 담당자 선택 후 "데이터 기반 생성" 또는 "AI 이슈공유 생성" 가능
- 이슈를 카테고리별로 분류: 진행, 오늘마감, 지연, 리스크
- AI 생성 시 `useAIRunner`/`useMultiAIRunner` 훅으로 CLI 백그라운드 실행
- AI 태스크 매니저에 태스크 등록 → 다른 페이지로 이동 가능
- 완료 시 사이드바 🤖 → 태스크 패널에서 클릭 → `AITaskDetailModal`에서 결과 확인·저장
- "데이터 기반 생성"은 즉시 완료 태스크로 등록되어 바로 결과 확인 가능
- "데이터 기반 생성" 결과는 시각적 슬라이드 프레젠터(`DailySharePresenter`)로 표시:
  - **개요 슬라이드**: 담당자, 날짜, 카테고리별 이슈 건수 카드
  - **타임라인 슬라이드**: 진행중 이슈를 날짜 기반 Gantt 바로 시각화 (고정 라벨 + 스크롤 차트, 드래그 리사이즈 구분선, 오늘 기준선, D-day 뱃지)
  - **티켓 카드 슬라이드**: 오늘마감/지연/리스크 이슈를 심각도별 카드로 표시
  - **요약 슬라이드**: 전체 통계 및 주요 포인트
- AI 생성 결과는 기존 마크다운 프레젠터(`SectionPresenter`)로 표시

### 오늘의 업무

- 현재 진행중(`statusCategory === 'indeterminate'`)인 이슈를 우선순위에 따라 정렬하여 최대 10건 표시
- 우선순위 정렬 기준:
  1. priority 필드 심각도 (Highest > High > Medium > Low > Lowest > null)
  2. 마감 임박(D-0~D-1) + 진행중인 이슈 우선
  3. 리뷰중 상태(status에 "review" 포함) 우선
  4. dueDate 가까운 순 (없으면 뒤로)
  5. updated 최신 순
- 이슈 타입 필터 칩으로 에픽/스토리/작업/버그 등 토글 가능
- 각 아이템에 우선순위 색상 dot, D-day 뱃지(D+N, D-Day, D-1, D-2~3), 상태 뱃지 표시
- 클릭 시 이슈 상세 모달 열림

### 이번 주 마감 이슈

- dueDate가 이번 주 내인 이슈 목록
- 이슈 키, 상태 뱃지, 마감일, 담당자 표시

### 담당자별 워크로드

- 진행중 이슈를 담당자별로 집계
- 수평 바 차트로 시각화

### 최근 업데이트 이슈

- updated 기준 정렬된 최근 이슈 목록
- 이슈 타입 컬러 뱃지, 상대 시간 표시
- 클릭 시 이슈 상세 모달 열림

### 이슈 타입별 분포

- epic, story, task, sub-task, bug 별 개수
- 컬러 칩으로 시각화

### 최근 변경 추적

- changelog 데이터에서 최근 15건 표시
- 변경 타입별 뱃지 (상태변경, 담당자변경, 신규 등)
- 변경 전/후 값과 감지 시각 표시

## 모듈 구성

| 레이어 | 모듈 | 역할 |
|--------|------|------|
| UI | `DashboardPage` | 훅 조합 및 레이아웃 (조합 지점) |
| UI | `TodayFocus` | 오늘의 업무 목록 (우선순위 정렬, 이슈 타입 필터) |
| UI | `SummaryCards` | 요약 카드 (전체/진행중/완료/미착수) |
| UI | `DueThisWeek` | 이번 주 마감 이슈 목록 |
| UI | `WorkloadChart` | 담당자별 워크로드 바 차트 |
| UI | `RecentUpdates` | 최근 업데이트 이슈 목록 |
| UI | `TypeDistribution` | 이슈 타입별 분포 |
| UI | `ChangeTracking` | 최근 변경 추적 목록 |
| UI Logic | `useDashboardStats` | 기간 필터, 통계 파생값 |
| UI Logic | `useDailyShare` | 이슈공유 생성 로직 |
| UI | `DailySharePresenter` | 시각적 슬라이드 프레젠터 (키보드 네비게이션, 프로그레스 바) |
| UI | `OverviewSlide` | 개요 슬라이드 (카테고리별 이슈 건수) |
| UI | `TimelineSlide` | Gantt 바 타임라인 (고정 라벨 + 스크롤 차트, 드래그 리사이즈 구분선, 오늘 기준선) |
| UI | `TicketCardSlide` | 티켓 카드 그리드 (심각도별 색상) |
| UI | `SummarySlide` | 요약 통계 슬라이드 |
| Business | `utils/daily-share` | buildDailyShareSlides, 슬라이드 타입 정의 |
| Business | `utils/dashboard` | computeDashboardStats, filterDashboardIssues, computeTodayFocus, getPriorityWeight, DATE_PRESETS, changeTypeConfig |
| Business | `utils/issue` | normalizeType, issueTypeColors, statusBadgeClass |
| Business | `utils/formatters` | formatRelativeTime |
