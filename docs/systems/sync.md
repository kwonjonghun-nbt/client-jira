# 동기화 시스템

## 개요

Jira REST API v3에서 이슈를 수집하고, 정규화하여 로컬에 저장하며, 변경사항을 추적하는 시스템.

## 구성 요소

### jira-client (`services/jira-client.ts`)

- Jira REST API v3 클라이언트
- Basic Auth (email + API token), axios 기반
- `testConnection()` — 연결 테스트 (`/rest/api/3/myself`)
- `getProjects()` — 프로젝트 목록 조회
- `searchIssues(jql)` — 이슈 검색 (POST `/rest/api/3/search/jql`, `nextPageToken` 기반 페이징)
- `fetchAllIssues(jql, onProgress)` — 전체 이슈 수집 (자동 페이징, 진행 콜백)
- `buildJql(projects, assignees, customJql)` — 설정 기반 JQL 빌드
- `fetchIssueChangelog(issueKey)` — 이슈 changelog 조회 (페이지네이션)
- 모든 API 호출에 `retry` 유틸 적용 (지수 백오프, 최대 3회)

수집 필드: `summary`, `description`, `status`, `assignee`, `reporter`, `priority`, `issuetype`, `created`, `updated`, `duedate`, `labels`, `components`, `resolution`, `timetracking`, `parent`, `subtasks`, `issuelinks`, `customfield_10016` (Story Points), `customfield_10020` (Sprint)

### sync (`services/sync.ts`)

- 동기화 오케스트레이션 (`SyncService` 클래스)
- 설정에서 프로젝트·담당자·커스텀 JQL 조건 읽기
- jira-client로 이슈 수집 → normalize → diff → storage 저장
- 동기화 진행 상태를 Renderer에 IPC 이벤트로 전송 (`sync:progress`, `sync:complete`)
- 이전 데이터와 diff 비교 후 changelog 저장
- latest 저장 + snapshot 저장 + meta(동기화 이력) 관리
- 오래된 데이터 자동 정리 (`retentionDays` 기반)
- 중복 실행 방지 (`isRunning` 플래그)

```typescript
SyncResult { success, issueCount, duration, error? }
```

### normalize (`utils/normalize.ts`)

Jira Raw 응답을 `NormalizedIssue` 형태로 변환:

```
NormalizedIssue {
  key, summary, description, status, statusCategory,
  issueType, priority, assignee, reporter,
  storyPoints, sprint,
  labels, components, created, updated,
  startDate, dueDate, resolution,
  timeTracking, parent, subtasks, issueLinks
}
```

- `description`: ADF(Atlassian Document Format) JSON → Markdown 문자열로 변환 (`adf-to-markdown` 라이브러리, `convertADFToMarkdown` 함수)
- `storyPoints`: `customfield_10016`에서 추출
- `sprint`: `customfield_10020` 배열에서 active sprint 우선, 없으면 첫 번째 sprint name
- `startDate`: active sprint의 startDate

### diff (`utils/diff.ts`)

이전/현재 이슈 목록을 비교하여 변경 목록(`ChangelogEntry[]`) 생성:

- 신규 이슈 (`created`)
- 상태 변경 (`status`)
- 담당자 변경 (`assignee`)
- 우선순위 변경 (`priority`)
- 스토리 포인트 변경 (`storyPoints`)
- 해결 완료 (`resolved` — resolution이 null → 값으로 전환)

### retry (`utils/retry.ts`)

- 지수 백오프 재시도 유틸 (baseDelay × 2^attempt)
- 기본 최대 3회, 초기 지연 1000ms
- jira-client의 모든 API 호출에 적용

### scheduler (`services/scheduler.ts`)

- node-cron 기반 자동 동기화 스케줄러
- 설정에서 읽은 시간(`HH:MM`)에 자동 실행
- 활성/비활성 토글
- `getNextRunTime(schedule)` — 다음 실행 예정 시각 반환

## 데이터 흐름

```
설정 (projects, assignees, customJql)
    ↓
buildJql() → JQL 문자열
    ↓
fetchAllIssues(jql, onProgress)
    ↓ (nextPageToken 기반 자동 페이징)
Raw Jira Response (JiraIssue[])
    ↓
normalizeIssues() → NormalizedIssue[]
    ↓
diffIssues(previous, current) → ChangelogEntry[]
    ↓
storage.saveLatest() + saveSnapshot() + appendChangelog()
    ↓
meta 업데이트 (syncHistory) + 오래된 데이터 정리
    ↓
IPC 이벤트 → Renderer 알림 (sync:progress, sync:complete)
```

## IPC 채널

| 채널 | 방향 | 용도 |
|------|------|------|
| `sync:trigger` | Renderer → Main | 수동 동기화 실행 |
| `sync:get-status` | Renderer → Main | 동기화 상태 조회 (isRunning, lastSync, lastResult) |
| `sync:progress` | Main → Renderer | 동기화 진행률 이벤트 (current, total, percentage) |
| `sync:complete` | Main → Renderer | 동기화 완료 이벤트 |
| `jira:test-connection` | Renderer → Main | Jira 연결 테스트 |
| `jira:get-projects` | Renderer → Main | 프로젝트 목록 조회 |
| `jira:get-issue-changelog` | Renderer → Main | 이슈 changelog 조회 |
