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

## 모듈 구성

| 레이어 | 모듈 | 역할 |
|--------|------|------|
| UI | `TimelinePage` | 훅 조합 및 레이아웃 |
| UI | `TimelineChart` | 간트 차트 렌더링 |
| UI | `IssueFilters` | 공통 이슈 필터 |
| UI Logic | `useTimelineControls` | 뷰 모드, 줌, 기간 필터, 타입 토글 |
| UI Logic | `useFilters` | 공통 이슈 필터링 |
| Business | `utils/timeline` | VIEW_MODE_OPTIONS, ZOOM 상수 |
| Business | `utils/dashboard` | DATE_PRESETS |
