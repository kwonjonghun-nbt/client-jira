# 라벨별 통계 페이지

## 개요

Jira 이슈의 라벨별 완료율과 분포를 테이블 또는 도넛 차트로 시각화하는 통계 페이지.

## 기능

### 라벨별 통계

- 라벨별 전체/완료/미완료 이슈 수 집계
- 완료율 퍼센트 및 프로그레스 바
- 라벨 없는 이슈는 "(없음)"으로 분류

### 뷰 모드

- **테이블 뷰**: 라벨, 전체, 완료, 미완료, 완료율 컬럼
- **차트 뷰**: DonutChart + 범례

### 필터

- 이슈 필터 (프로젝트, 타입, 상태, 담당자, 우선순위)
- 기간 프리셋 (선택된 프리셋 활성 표시) + 커스텀 날짜 범위

### 요약 정보

- 라벨 개수, 이슈 총 건수 (중복 포함), 완료 건수

## 모듈 구성

| 레이어 | 모듈 | 역할 |
|--------|------|------|
| UI | `StatsPage` | 훅 조합 및 레이아웃 |
| UI | `DonutChart` | SVG 도넛 차트 |
| UI | `IssueFilters` | 공통 이슈 필터 |
| UI Logic | `useStatsPage` | 기간 필터, 라벨 통계 파생값, 뷰 모드 |
| UI Logic | `useFilters` | 공통 이슈 필터링 |
| Business | `utils/stats` | computeLabelStats, computeStatsSummary, matchPresetDays |
