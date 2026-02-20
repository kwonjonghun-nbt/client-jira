# 아키텍처

## 기술 스택

| 영역 | 기술 |
|------|------|
| 런타임 | Electron 34 |
| 빌드 | Electron Forge + Vite 7 |
| 프론트엔드 | React 19, TypeScript 5 |
| 스타일링 | Tailwind CSS 4 |
| 상태 관리 | Zustand 5 (전역), React Query 5 (서버) |
| 검증 | Zod 4 |
| 테스트 | Vitest 4 |
| 터미널 | node-pty + xterm.js |

## 레이어 구조

```
UI Layer          → components/, pages/     렌더링만 담당
State Layer       → store/                  상태 저장·구독
UI Logic Layer    → hooks/                  파생값·이벤트 핸들링
Business Logic    → services/, utils/       도메인 규칙·변환
Data Layer        → schemas/, types/, ipc/  스키마·타입·외부 통신
```

의존 방향: `Data ← Business ← UI Logic ← State ← UI`

## 프로세스 구조

### Main 프로세스 (`src/main/`)

| 디렉토리 | 역할 |
|----------|------|
| `services/` | 비즈니스 로직 (sync, storage, ai-runner, terminal, scheduler, slack, daily-report-scheduler, dm-reminder-scheduler) |
| `ipc/` | IPC 핸들러 (Main↔Renderer 통신) |
| `schemas/` | Zod 스키마 (설정, 이슈 정규화) |
| `utils/` | 순수 변환 함수 (normalize, diff) |

### Renderer 프로세스 (`src/renderer/`)

| 디렉토리 | 역할 |
|----------|------|
| `pages/` | 페이지 컴포넌트 — 훅과 컴포넌트를 조합하는 지점 |
| `components/` | 재사용 UI 컴포넌트 |
| `hooks/` | 커스텀 훅 — 관심사별 분리 |
| `store/` | Zustand 스토어 (uiStore, aiConfigStore, aiTaskStore) |
| `utils/` | Renderer 순수 유틸 |
| `types/` | TypeScript 인터페이스 |

### Shared (`src/shared/`)

Main/Renderer 공유 타입 정의.

## 데이터 흐름

```
Jira API → jira-client → sync → normalize → storage (JSON)
                                                ↓
                          IPC ← storage.handlers ← file read
                           ↓
                     React Query cache → hooks → components
```

1. **수집**: `jira-client`가 Jira REST API에서 이슈를 가져옴
2. **정규화**: `normalize`가 Raw 데이터를 `NormalizedIssue` 형태로 변환
3. **변경 추적**: `diff`가 이전 데이터와 비교하여 changelog 생성
4. **저장**: `storage`가 JSON 파일로 영속화
5. **조회**: Renderer가 IPC를 통해 데이터 요청 → React Query 캐시
6. **표시**: hooks가 파생값 계산 → components가 렌더링

## IPC 통신

| 네임스페이스 | 핸들러 | 역할 |
|-------------|--------|------|
| `jira` | jira.handlers | 프로젝트 목록 조회, 이슈 changelog 조회 |
| `sync` | sync.handlers | 동기화 실행, 상태 이벤트 |
| `settings` | settings.handlers | 설정 CRUD |
| `storage` | storage.handlers | 이슈·리포트·OKR·changelog 조회/저장 |
| `terminal` | terminal.handlers | PTY 세션 생성/입력/종료 |
| `ai` | ai.handlers | AI CLI 실행/중단 |
| `updater` | updater.handlers | 앱 업데이트 확인/설치 |
| `slack` | slack.handlers | 슬랙 웹훅 테스트, Bot Token 연결 테스트, 스레드 메시지 검색, 일일 리포트 수동 트리거, DM 테스트, DM 리마인더 수동 트리거 |

## 전역 상태

### uiStore (Zustand)

- `currentPage` — 현재 활성 페이지
- `selectedIssue` — 이슈 상세 모달 대상
- `setPage()`, `openIssueDetail()`, `closeIssueDetail()`

### aiConfigStore (Zustand)

- `aiType` — AI CLI 종류 (claude | gemini)
- `claudeModel` — Claude 모델 (claude-sonnet-4-20250514 | claude-opus-4-20250115)
- `geminiModel` — Gemini 모델 (gemini-2.5-pro | gemini-2.5-flash)
- `setAIType()`, `setClaudeModel()`, `setGeminiModel()`

### aiTaskStore (Zustand)

- `tasks` — AI 태스크 목록 (실행중/완료/에러)
- `panelOpen` — 사이드바 AI 태스크 패널 표시 여부
- `selectedTaskId` — 상세 모달 대상 태스크
- IPC 이벤트 핸들러: `appendChunk()`, `markJobDone()`, `markJobError()`
