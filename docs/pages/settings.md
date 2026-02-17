# 설정 페이지

## 개요

Jira 연결, 데이터 수집, 스케줄, AI, 앱 업데이트 설정을 관리하는 페이지.

## 기능

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
- `terminalStore`에 `aiType` 저장

### 앱 업데이트

- 업데이트 확인 버튼
- 새 버전 다운로드 → 재시작 설치

## 모듈 구성

| 레이어 | 모듈 | 역할 |
|--------|------|------|
| UI | `SettingsPage` | 설정 폼 조합 |
| UI | `JiraConnectionForm` | Jira 연결 입력 폼 |
| UI | `ProjectSelector` | 프로젝트 선택 UI |
| UI | `AssigneeInput` | 담당자 입력 UI |
| UI | `ScheduleConfig` | 스케줄 설정 UI |
| UI | `StorageConfig` | 저장 설정 UI |
| UI Logic | `useSettings` | React Query 기반 설정 CRUD |
| UI Logic | `useToken` | API 토큰 관리 (키체인) |
| UI Logic | `useTestConnection` | Jira 연결 테스트 |
| UI Logic | `useUpdater` | 앱 업데이트 상태 관리 |
