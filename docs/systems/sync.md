# 동기화 시스템

## 개요

Jira REST API에서 이슈를 수집하고, 정규화하여 로컬에 저장하며, 변경사항을 추적하는 시스템.

## 구성 요소

### jira-client (`services/jira-client.ts`)

- Jira REST API v2 클라이언트
- Basic Auth (email + API token)
- 이슈 검색 (JQL), 프로젝트 목록 조회
- 이슈 changelog 조회 (REST API v3, 페이지네이션)
- 페이징 처리 (maxResults 기반)

### sync (`services/sync.ts`)

- 동기화 오케스트레이션
- 설정에서 프로젝트·담당자 조건 읽기
- jira-client로 이슈 수집 → normalize → diff → storage 저장
- 동기화 진행 상태를 Renderer에 IPC 이벤트로 전송

### normalize (`utils/normalize.ts`)

Jira Raw 응답을 `NormalizedIssue` 형태로 변환:

```
NormalizedIssue {
  key, summary, description, status, statusCategory,
  issueType, priority, assignee, reporter,
  labels, project, created, updated,
  dueDate, startDate, resolution,
  timeTracking, parent, subtasks, issueLinks
}
```

- `description`: ADF(Atlassian Document Format) JSON → Markdown 문자열로 변환 (`adf-to-markdown` 라이브러리 사용)

### diff (`utils/diff.ts`)

이전/현재 이슈 목록을 비교하여 변경 목록 생성:

- 신규 이슈
- 상태 변경
- 담당자 변경
- 우선순위 변경
- 마감일 변경

### scheduler (`services/scheduler.ts`)

- node-cron 기반 자동 동기화 스케줄러
- 설정에서 읽은 시간에 자동 실행
- 활성/비활성 토글

## 데이터 흐름

```
설정 (projects, assignees)
    ↓
jira-client.searchIssues(JQL)
    ↓
Raw Jira Response
    ↓
normalize() → NormalizedIssue[]
    ↓
diff(previous, current) → ChangelogEntry[]
    ↓
storage.saveIssues() + storage.saveChangelog()
    ↓
IPC 이벤트 → Renderer 알림
```

## IPC 채널

| 채널 | 방향 | 용도 |
|------|------|------|
| `sync:run` | Renderer → Main | 수동 동기화 실행 |
| `sync:status` | Main → Renderer | 동기화 진행 상태 이벤트 |
