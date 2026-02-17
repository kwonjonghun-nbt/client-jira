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
| UI | `SummaryCards` | 요약 카드 (전체/진행중/완료/미착수) |
| UI | `DueThisWeek` | 이번 주 마감 이슈 목록 |
| UI | `WorkloadChart` | 담당자별 워크로드 바 차트 |
| UI | `RecentUpdates` | 최근 업데이트 이슈 목록 |
| UI | `TypeDistribution` | 이슈 타입별 분포 |
| UI | `ChangeTracking` | 최근 변경 추적 목록 |
| UI Logic | `useDashboardStats` | 기간 필터, 통계 파생값 |
| UI Logic | `useDailyShare` | 이슈공유 생성 로직 |
| Business | `utils/dashboard` | computeDashboardStats, filterDashboardIssues, DATE_PRESETS, changeTypeConfig |
| Business | `utils/issue` | normalizeType, issueTypeColors, statusBadgeClass |
| Business | `utils/formatters` | formatRelativeTime |
