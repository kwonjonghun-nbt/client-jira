# 과제 목록 페이지

## 개요

동기화된 Jira 이슈를 테이블 형태로 조회하고, 필터·검색·상세 모달을 제공하는 페이지.

## 기능

### 이슈 테이블

- 컬럼: 키, 타입, 요약, 상태, 우선순위, 담당자, 마감일
- 이슈 타입별 컬러 뱃지
- 상태 카테고리별 뱃지 스타일 (new, indeterminate, done)
- 행 클릭 시 이슈 상세 모달 열림

### 필터

- **프로젝트**: 드롭다운 (동기화된 프로젝트 목록에서 추출)
- **이슈 타입**: 드롭다운 (epic, story, task, sub-task, bug)
- **상태**: 토글 버튼 (해야 할 일, 진행 중, 완료)
- **담당자**: 드롭다운
- **우선순위**: 드롭다운
- **검색**: 키워드 텍스트 검색 (키, 요약 대상)

### 이슈 상세 모달

- `IssueDetailModal` — 이슈 전체 정보 표시
- Jira 원본 링크
- 하위 이슈, 연결된 이슈 표시
- AI 분석 프롬프트 생성·복사 기능

### 동기화 상태

- 마지막 동기화 시각, 총 이슈 수, 프로젝트 목록 표시
- SyncButton으로 수동 동기화 실행

## 모듈 구성

| 레이어 | 모듈 | 역할 |
|--------|------|------|
| UI | `MainPage` | 훅 조합 및 레이아웃 |
| UI | `IssueTable` | 이슈 테이블 렌더링 |
| UI | `IssueFilters` | 필터 UI |
| UI | `IssueSearch` | 검색 입력 |
| UI | `IssueDetailModal` | 이슈 상세 |
| UI | `SyncButton`, `SyncStatus` | 동기화 UI |
| UI Logic | `useFilters` | 필터 상태 관리, 필터 적용 |
| UI Logic | `useJiraIssues` | React Query 기반 이슈 데이터 조회 |
| Business | `utils/issue` | 타입 정규화, 뱃지 스타일 |
