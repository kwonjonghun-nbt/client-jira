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

### 슬랙 일일 리포트

- 일일 공유 리포트 활성화 ON/OFF 토글
- Slack Incoming Webhook URL 입력 + 테스트 전송 버튼
- 리포트 전송 시간 설정 (기본 11:20)
- 수동 리포트 생성/전송 버튼
- 매일 지정 시간에 담당자별 AI 리포트를 자동 생성하여 슬랙으로 전송

#### 스레드 댓글 모드

- 스레드 댓글 전송 ON/OFF 토글
- Slack Bot Token (`xoxb-`) 입력 (필요 권한: `channels:history`, `chat:write`)
- Channel ID 입력 + 연결 테스트 버튼
- 검색 텍스트 입력 + 미리보기 버튼 (오늘 해당 텍스트를 포함한 메시지 검색)
- 활성화 시: 채널에서 오늘 날짜의 특정 메시지를 찾아 스레드 댓글로 리포트 전송
- 대상 메시지 미발견 시 Webhook fallback (Webhook URL이 설정된 경우)
- 스레드 리포트 포맷: 컴포넌트 → 에픽 → 하위작업 구조로 담당자별 진행중 업무 표시
- 진행중 하위작업이 없는 에픽은 생략, 티켓 번호에 Jira 링크 포함

#### DM 리마인더

- DM 리마인더 활성화 ON/OFF 토글
- 스케줄 설정: 시간 + 메시지를 자유롭게 추가/삭제 (기본 3개: 10:30, 15:00, 18:30)
- 평일(월~금)만 발송
- 담당자 ↔ Slack User ID 수동 매핑 (담당자별 체크박스로 활성/비활성 선택)
- 개별 DM 테스트 전송 버튼
- 수동 DM 리마인더 전송 버튼
- Bot Token의 `chat:write` 권한 필요 (기존 스레드 모드와 동일)
- 수집 대상 담당자 목록에서 원하는 사람만 추가 가능

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
| UI | `SlackConfig` | 슬랙 일일 리포트 설정 UI |
| UI | `DMReminderConfig` | DM 리마인더 설정 UI |
| UI Logic | `useSettings` | React Query 기반 설정 CRUD |
| UI Logic | `useToken` | API 토큰 관리 (키체인) |
| UI Logic | `useTestConnection` | Jira 연결 테스트 |
| UI Logic | `useUpdater` | 앱 업데이트 상태 관리 |
