# 저장소 시스템

## 개요

모든 앱 데이터를 JSON 파일 기반으로 영속화하는 시스템. Electron의 `app.getPath('userData')` 디렉토리에 저장.

## 구성 요소

### StorageService (`services/storage.ts`)

Main 프로세스 서비스:

| 메서드 | 용도 |
|--------|------|
| `saveIssues()` | 이슈 데이터 저장 |
| `loadIssues()` | 이슈 데이터 조회 |
| `saveSettings()` / `loadSettings()` | 설정 CRUD |
| `saveReport()` / `loadReport()` / `listReports()` / `deleteReport()` | 리포트 파일 관리 |
| `saveOKR()` / `loadOKR()` | OKR 데이터 CRUD |
| `saveChangelog()` / `loadChangelog()` | 변경 추적 데이터 |
| `saveLabelNotes()` / `loadLabelNotes()` | 라벨 메모 CRUD |

### IPC 핸들러 (`ipc/storage.handlers.ts`)

Renderer에서 IPC를 통해 StorageService 메서드 호출.

### credentials (`services/credentials.ts`)

- Jira API 토큰을 시스템 키체인에 저장
- `safeStorage.encryptString()` / `decryptString()` 사용

## 저장 경로

```
{userData}/
├── issues.json          — 동기화된 Jira 이슈
├── settings.json        — 앱 설정
├── okr.json             — OKR 데이터
├── changelog.json       — 변경 추적 로그
├── label-notes.json     — 라벨 메모
└── reports/
    ├── report-title.md  — 저장된 리포트 파일들
    └── ...
```

## 데이터 형태

### issues.json

```ts
{
  issues: NormalizedIssue[],
  syncedAt: string,       // 마지막 동기화 시각
  totalCount: number,
  source: {
    baseUrl: string,
    projects: string[],
  }
}
```

### settings.json

```ts
{
  jira: { baseUrl, email },
  collection: { projects, assignees },
  schedule: { enabled, times },
  storage: { retentionDays }
}
```

### okr.json

```ts
{
  objectives: OKRObjective[],
  keyResults: OKRKeyResult[],
  links: OKRLink[],
  virtualTickets: OKRVirtualTicket[],
  groups: OKRGroup[],
  relations: OKRRelation[],
  updatedAt: string
}
```

## Renderer 데이터 조회

React Query를 통해 IPC 데이터를 캐시:

| 훅 | queryKey | 역할 |
|----|----------|------|
| `useJiraIssues` | `['jira-issues']` | 이슈 데이터 |
| `useSettings` | `['settings']` | 설정 |
| `useReports` | `['reports']` | 리포트 목록 |
| `useReport` | `['report', filename]` | 리포트 상세 |
| `useOKR` | `['okr']` | OKR 데이터 |
| `useChangelog` | `['changelog']` | 변경 추적 |
| `useLabelNotes` | `['label-notes']` | 라벨 메모 |
