# 타임라인 페이지

## 개요

Jira 이슈를 간트 차트 형태로 시각화하는 타임라인 뷰.

## 기능

### 간트 차트

- `TimelineChart` 컴포넌트로 이슈를 수평 바로 표시
- 이슈의 startDate ~ dueDate 기간을 바 길이로 표현
- 오늘 날짜 기준선 (빨간 수직선)

### 뷰 모드

- 일간(day), 주간(week), 월간(month) 단위 전환
- 플로팅 컨트롤 패널에서 전환

### 줌/스크롤

- 줌 인/아웃 (MIN ~ MAX 범위)
- "오늘" 버튼으로 현재 날짜 위치로 스크롤
- 컨트롤 패널 접기/펼치기

### 필터

- 이슈 필터 (프로젝트, 타입, 상태, 담당자, 우선순위)
- 기간 프리셋 + 커스텀 날짜 범위
- 타임라인 설정: 이슈 타입별 바/행 표시 토글

### 표시 설정

- 이슈 타입별로 바(bar) 표시 ON/OFF
- 이슈 타입별로 행(row) 표시 ON/OFF
- 오늘의 업무 패널 ON/OFF

### 오늘의 업무 패널

타임라인 설정 메뉴에서 "오늘의 업무 보기" 토글을 켜면 타임라인 오른쪽에 사이드 패널이 표시된다. 데일리 스크럼 시 전체 일정을 보면서 진행중인 이슈에 집중할 때 사용한다.

패널 구성:
- **이슈공유**: 담당자 선택 후 "데이터 기반" 또는 "AI 생성"으로 이슈공유 생성. 카테고리별(진행/마감/지연/리스크) 이슈 건수 표시
- **오늘의 업무**: 진행중 이슈를 우선순위에 따라 정렬하여 최대 10건 표시
  - 정렬 기준: priority 심각도 > 마감 임박(D-0~D-1) > 리뷰중 > dueDate 가까운 순 > updated 최신 순
  - 이슈 타입 필터 칩으로 토글 가능
  - 우선순위 dot, D-day 뱃지, 상태 뱃지 표시
  - 클릭 시 이슈 상세 모달 열림

## 모듈 구성

| 레이어 | 모듈 | 역할 |
|--------|------|------|
| UI | `TimelinePage` | 훅 조합 및 레이아웃 |
| UI | `TimelineChart` | 간트 차트 렌더링 |
| UI | `TodayPanel` | 오늘의 업무 사이드 패널 (이슈공유 + TodayFocus 조합) |
| UI | `TodayFocus` | 오늘의 업무 목록 (우선순위 정렬, 이슈 타입 필터) |
| UI | `IssueFilters` | 공통 이슈 필터 |
| UI Logic | `useTimelineControls` | 뷰 모드, 줌, 기간 필터, 타입 토글, 오늘의 업무 패널 토글 |
| UI Logic | `useFilters` | 공통 이슈 필터링 |
| UI Logic | `useDailyShare` | 이슈공유 생성 로직 |
| Business | `utils/timeline` | VIEW_MODE_OPTIONS, ZOOM 상수 |
| Business | `utils/dashboard` | DATE_PRESETS, computeTodayFocus |
