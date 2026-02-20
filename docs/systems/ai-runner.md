# AI Runner 시스템

## 개요

Claude/Gemini CLI를 백그라운드에서 비대화형 모드(`-p`)로 실행하고, 결과를 스트리밍으로 Renderer에 전달하는 시스템.

## 구성 요소

### AIRunnerService (`services/ai-runner.ts`)

Main 프로세스 서비스:

- `run(prompt, aiType, timeoutMs?)` — CLI 프로세스 생성, 결과 스트리밍. idle 타임아웃 내장 (기본 5분)
- `abort(id)` — 실행 중인 작업 종료 (stdin destroy → SIGTERM 순서로 안전 종료)
- `updateWindow(win)` — BrowserWindow 재생성 시 IPC 대상 윈도우 갱신
- `destroyAll()` — 앱 종료 시 모든 실행 중인 job 정리 (타이머 해제 + SIGTERM)
- 인터랙티브 로그인 쉘(`/bin/zsh -l -i -c`)로 실행하여 `~/.zshrc` 기반 PATH 환경(nvm 등) 로드
- oh-my-zsh 자동 업데이트 방지 환경변수 설정 (`DISABLE_AUTO_UPDATE`, `ZSH_DISABLE_AUTO_UPDATE`)
- stdin에 EPIPE 에러 핸들러 등록 — 프로세스 조기 종료 시 uncaught exception 방지
- stdin으로 프롬프트 전달 → stdout 청크 단위 IPC 전송
- **Idle 타임아웃**: stdout chunk 수신 시마다 타이머 리셋. 마지막 출력 이후 5분간 무응답이면 프로세스 kill + `ai:error` 전송. 응답 생성 중(chunk 수신 중)에는 타임아웃되지 않음

#### CLI 명령

| AI 타입 | 명령 |
|---------|------|
| Claude | `claude -p --output-format text --no-session-persistence --disallowedTools 'Edit,Write,Bash,NotebookEdit'` |
| Gemini | `gemini -p -o text` |

### IPC 핸들러 (`ipc/ai.handlers.ts`)

- `aiType` 런타임 검증: `'claude'` 또는 `'gemini'`이 아닌 값이 전달되면 `'claude'`로 fallback
- non-zero exit code 시 `ai:done` 대신 `ai:error` 전송

| 채널 | 방향 | 용도 |
|------|------|------|
| `ai:run` | Renderer → Main | AI 실행 요청, job ID 반환 |
| `ai:abort` | Renderer → Main | 실행 중단 |
| `ai:notify-task-completed` | Renderer → Main | 작업 완료/실패 시 OS 시스템 알림 요청 |
| `ai:chunk` | Main → Renderer | 텍스트 청크 스트리밍 |
| `ai:done` | Main → Renderer | 완료 (exitCode 포함) |
| `ai:error` | Main → Renderer | 에러 (message 포함) |

### useAIRunner (`hooks/useAIRunner.ts`)

Renderer 상태 관리 훅:

- 상태: `idle` → `running` (청크 누적) → `done` | `error`
- `run(prompt, aiType)` — IPC 호출, 이벤트 리스너 등록
- `abort()` — 실행 취소
- `reset()` — 상태 초기화
- cleanup 시 이벤트 리스너 자동 해제

### useMultiAIRunner (`hooks/useMultiAIRunner.ts`)

여러 AI 작업을 동시 관리하는 확장 훅.

### AI 태스크 매니저

AI 작업을 비동기 태스크로 관리하는 전역 시스템. 모달에 묶이지 않고 작업을 시켜놓고 다른 페이지에서 작업 가능. 사이드바 하단 🤖 버튼으로 태스크 패널을 토글한다.

#### aiTaskStore (`store/aiTaskStore.ts`)

Zustand 전역 스토어:

- `tasks: AITask[]` — 모든 AI 태스크 (최대 20개, 초과 시 오래된 완료 태스크 자동 제거)
- `panelOpen` — 태스크 패널 표시 여부
- `selectedTaskId` — 상세 모달로 볼 태스크 ID
- IPC 이벤트 핸들러: `appendChunk`, `markJobDone`, `markJobError`
- 단일 작업 및 멀티 작업(subJobs) 모두 지원
- 작업 최종 완료/실패 시 `ai:notify-task-completed` IPC로 OS 시스템 알림 요청

#### useAITaskListener (`hooks/useAITaskListener.ts`)

App.tsx에서 한 번 마운트되는 전역 IPC 리스너. `ai:chunk`/`ai:done`/`ai:error` 이벤트를 받아 aiTaskStore에 기록. 기존 useAIRunner/useMultiAIRunner의 로컬 리스너와 병렬 동작.

#### 비즈니스 로직 (`utils/ai-tasks.ts`)

순수 함수 + 타입 정의:

- `AITask`, `AITaskType` ('report' | 'daily-share' | 'daily-share-multi' | 'issue-analysis'), `AITaskStatus`
- `createTaskId()`, `generateTaskTitle()`, `countRunningTasks()`, `countCompletedTasks()`, `mergeSubJobResults()`, `formatElapsedTime()`

#### UI 컴포넌트 (`components/ai-tasks/`)

| 컴포넌트 | 역할 |
|----------|------|
| `Sidebar` 🤖 버튼 | 사이드바 하단 버튼. 실행 중(빨간) / 완료(초록) 태스크 수 뱃지, 실행 중 pulse 애니메이션. 패널 토글 |
| `AITaskPanel` | 사이드바 버튼 클릭 시 드롭다운 태스크 목록. 상태 아이콘, 경과 시간, 멀티 진행률, 실행 중 태스크 중단 버튼 |
| `AITaskDetailModal` | 완료 태스크 클릭 시 SectionPresenter로 결과 표시 + 리포트 저장. canvas 타입은 CanvasResultModal로 위임 |
| `CanvasResultModal` | AI 캔버스 전용 완료 모달. 리포트 저장 없이 결과 확인 + "캔버스 열기"로 해당 KR 캔버스 이동 |

## 사용처

| 페이지 | 기능 |
|--------|------|
| 리포트 | AI 리포트 생성 (`useReportAI`) → 태스크로 등록 |
| 대시보드 | AI 이슈공유 생성 (`useDailyShare`) → 태스크로 등록 |
| 이슈 상세 | 티켓 분석하기 (`IssueDetailModal` 스플릿 버튼) → 태스크로 등록 |
| OKR 캔버스 | AI 캔버스 관리 (`useCanvasAI`) → 프롬프트로 그룹/관계/가상티켓 자동 수정 |
| 전역 | 사이드바 🤖 버튼 + `AITaskPanel` + `AITaskDetailModal` (App.tsx) |

### 시스템 알림 (`utils/notification.ts`)

작업 완료/실패 시 OS 네이티브 알림을 표시하는 Main 프로세스 유틸.

- `showTaskNotification({ title, status })` — Electron `Notification` API로 OS 알림 표시
- `buildTaskNotificationBody(status)` — 상태에 따른 알림 본문 생성 (순수 함수)
- `Notification.isSupported()` 체크 — 미지원 환경에서 안전하게 무시
- aiTaskStore의 `markJobDone`/`markJobError`에서 최종 상태 전환 시 `ai:notify-task-completed` IPC로 호출

## 상태 흐름

```
idle
  ↓ run()
running (ai:chunk → result에 텍스트 누적)
  ↓ ai:done
done (result에 전체 텍스트)
  ↓ reset()
idle

running → abort() → idle (태스크 패널 중단 버튼 또는 훅에서 호출)
running → ai:error → error
running → idle timeout (5분 무응답) → ai:error → error
```

### 태스크 흐름 (AI 태스크 매니저)

```
useReportAI/useDailyShare/IssueDetailModal
  ↓ ai.run() → jobId 반환
aiTaskStore.addTask({ jobIds: [jobId], status: 'running' })
  ↓ useAITaskListener
ai:chunk → appendChunk (result 누적)
ai:done → markJobDone (status: 'done')
  ↓ 사용자가 사이드바 🤖 버튼 → AITaskPanel → 태스크 클릭
AITaskDetailModal (SectionPresenter로 결과 표시, 리포트 저장)
```
