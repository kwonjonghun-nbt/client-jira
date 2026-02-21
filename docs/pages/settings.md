# 설정 페이지

## 개요

Jira 연결, 데이터 수집, 스케줄, 팀 관리, AI, 앱 업데이트 설정을 관리하는 페이지.

## 화면 구조

설정 페이지는 **리스트 화면**과 **상세 화면** 2단계로 구성된다.

- **리스트 화면**: 8개 설정 카테고리를 제목+설명으로 나열. 카테고리 클릭 시 상세로 이동.
- **상세 화면**: 선택한 카테고리의 설정 폼 + 저장 버튼. "← 설정" 버튼으로 리스트 복귀.

`uiStore.settingsSection` 상태로 전환을 관리하며, 다른 페이지로 이동 시 자동으로 null(리스트)로 초기화된다.

## 기능

### 팀 관리

- 팀 생성/삭제, 팀 이름·색상 편집
- 수집 대상 담당자를 팀에 배분 (토글 칩 방식)
- **팀별 슬랙 설정** (웹훅, 리포트 시간, 스레드 모드) — 슬랙 리포트는 팀 단위로만 관리
- **팀별 DM 리마인더 설정** (스케줄, 사용자 매핑) — DM 리마인더도 팀 단위로만 관리
- 사이드바 TeamSelector 드롭다운으로 팀 선택 → 모든 페이지에서 해당 팀 이슈만 표시
- "전체" 선택 시 모든 이슈 표시
- 기존 설정(v0.11.0 이전)은 앱 시작 시 자동으로 "기본 팀"으로 마이그레이션 (레거시 앱 레벨 slack 필드 포함)

#### 데이터 필터링 방식

- **Option B**: 단일 JQL fetch → Renderer에서 팀 assignees로 필터링
- `useTeamIssues` 훅이 `useJiraIssues`를 래핑하여 `selectedTeamId`에 따라 `filterStoredDataByTeam` 적용
- `assignee`(displayName) 또는 `assigneeEmail` 중 하나라도 팀 assignees에 포함되면 매칭

#### 팀별 스케줄러

- 팀별 DailyReportScheduler, DMReminderScheduler 인스턴스를 개별 생성
- 각 팀의 슬랙 설정(웹훅, 시간, 스레드 모드)과 팀 assignees 기반으로 독립 동작
- `AppServices.teamSchedulers` Map으로 관리, 설정 저장 시 자동 재시작

### Jira 연결

- Base URL, 이메일, API 토큰 입력
- 연결 테스트 버튼
- 토큰은 시스템 키체인에 안전하게 저장 (`credentials` 서비스)

### 수집 대상

- **프로젝트 선택**: Jira에서 프로젝트 목록을 가져와 선택
- **담당자 입력**: 수집 대상 담당자 목록 관리

### 스케줄

- 자동 동기화 ON/OFF 토글
- 동기화 시간 설정 (node-cron 기반)

### 저장

- 데이터 보관 기간(일) 설정

### AI 에이전트

- CLI 에이전트 선택 (Claude / Gemini)
- 에이전트별 모델 선택 드롭다운
  - Claude: Sonnet 4, Opus 4
  - Gemini: 2.5 Pro, 2.5 Flash
- `terminalStore`에 `aiType`, `claudeModel`, `geminiModel` 저장
- 선택한 모델은 CLI 실행 시 `--model` 플래그로 전달

### 앱 업데이트

- 업데이트 확인 버튼
- 새 버전 다운로드 → 재시작 설치

## 모듈 구성

| 레이어 | 모듈 | 역할 |
|--------|------|------|
| UI | `SettingsPage` | 리스트/상세 분기 + 설정 폼 조합 |
| UI | `TeamManagement` | 팀 CRUD, 멤버 배분, 팀별 슬랙/DM 설정 |
| UI | `TeamSelector` | 사이드바 팀 선택 드롭다운 |
| UI | `SettingsListView` | 설정 카테고리 리스트 화면 |
| UI | `SettingsDetailView` | 상세 화면 래퍼 (뒤로가기 + 제목) |
| UI | `JiraConnectionForm` | Jira 연결 입력 폼 |
| UI | `ProjectSelector` | 프로젝트 선택 UI |
| UI | `AssigneeInput` | 담당자 입력 UI |
| UI | `ScheduleConfig` | 스케줄 설정 UI |
| UI | `StorageConfig` | 저장 설정 UI |
| UI | `SlackConfig` | 슬랙 일일 리포트 설정 UI |
| UI | `DMReminderConfig` | DM 리마인더 설정 UI |
| UI Logic | `useTeamIssues` | useJiraIssues + 팀 필터 조합 |
| Business | `filterIssuesByTeam` | 팀 assignees로 이슈 필터링 (displayName + email) |
| Business | `filterStoredDataByTeam` | StoredData에 팀 필터 적용 |
| Business | `migrateToTeams` | 기존 설정 → "기본 팀" 자동 마이그레이션 |
| UI Logic | `useSettings` | React Query 기반 설정 CRUD |
| UI Logic | `useToken` | API 토큰 관리 (키체인) |
| UI Logic | `useTestConnection` | Jira 연결 테스트 |
| UI Logic | `useUpdater` | 앱 업데이트 상태 관리 |
