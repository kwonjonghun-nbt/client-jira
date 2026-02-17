# AI Runner 시스템

## 개요

Claude/Gemini CLI를 백그라운드에서 비대화형 모드(`-p`)로 실행하고, 결과를 스트리밍으로 Renderer에 전달하는 시스템.

## 구성 요소

### AIRunnerService (`services/ai-runner.ts`)

Main 프로세스 서비스:

- `run(prompt, aiType)` — CLI 프로세스 생성, 결과 스트리밍
- `abort(id)` — 실행 중인 작업 종료
- 로그인 쉘(`/bin/zsh -l -c`)로 실행하여 PATH 환경 로드
- stdin으로 프롬프트 전달 → stdout 청크 단위 IPC 전송

#### CLI 명령

| AI 타입 | 명령 |
|---------|------|
| Claude | `claude -p --output-format text --no-session-persistence --disallowedTools 'Edit,Write,Bash,NotebookEdit'` |
| Gemini | `gemini -p -o text` |

### IPC 핸들러 (`ipc/ai.handlers.ts`)

| 채널 | 방향 | 용도 |
|------|------|------|
| `ai:run` | Renderer → Main | AI 실행 요청, job ID 반환 |
| `ai:abort` | Renderer → Main | 실행 중단 |
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

### 플로팅 AI 태스크 매니저

AI 작업을 비동기 태스크로 관리하는 전역 시스템. 모달에 묶이지 않고 작업을 시켜놓고 다른 페이지에서 작업 가능.

#### aiTaskStore (`store/aiTaskStore.ts`)

Zustand 전역 스토어:

- `tasks: AITask[]` — 모든 AI 태스크 (최대 20개, 초과 시 오래된 완료 태스크 자동 제거)
- `panelOpen` — 태스크 패널 표시 여부
- `selectedTaskId` — 상세 모달로 볼 태스크 ID
- IPC 이벤트 핸들러: `appendChunk`, `markJobDone`, `markJobError`
- 단일 작업 및 멀티 작업(subJobs) 모두 지원

#### useAITaskListener (`hooks/useAITaskListener.ts`)

App.tsx에서 한 번 마운트되는 전역 IPC 리스너. `ai:chunk`/`ai:done`/`ai:error` 이벤트를 받아 aiTaskStore에 기록. 기존 useAIRunner/useMultiAIRunner의 로컬 리스너와 병렬 동작.

#### 비즈니스 로직 (`utils/ai-tasks.ts`)

순수 함수 + 타입 정의:

- `AITask`, `AITaskType` ('report' | 'daily-share' | 'daily-share-multi'), `AITaskStatus`
- `createTaskId()`, `generateTaskTitle()`, `countRunningTasks()`, `mergeSubJobResults()`, `formatElapsedTime()`

#### UI 컴포넌트 (`components/ai-tasks/`)

| 컴포넌트 | 역할 |
|----------|------|
| `FloatingAIButton` | 우측 상단 플로팅 버튼. 실행 중 태스크 수 뱃지, pulse 애니메이션 |
| `AITaskPanel` | 버튼 클릭 시 드롭다운 태스크 목록. 상태 아이콘, 경과 시간, 멀티 진행률 |
| `AITaskDetailModal` | 완료 태스크 클릭 시 SectionPresenter로 결과 표시 + 리포트 저장 |

## 사용처

| 페이지 | 기능 |
|--------|------|
| 리포트 | AI 리포트 생성 (`useReportAI`) → 플로팅 태스크로 등록 |
| 대시보드 | AI 이슈공유 생성 (`useDailyShare`) → 플로팅 태스크로 등록 |
| 전역 | `FloatingAIButton` + `AITaskPanel` + `AITaskDetailModal` (App.tsx) |

## 상태 흐름

```
idle
  ↓ run()
running (ai:chunk → result에 텍스트 누적)
  ↓ ai:done
done (result에 전체 텍스트)
  ↓ reset()
idle

running → abort() → idle
running → ai:error → error
```

### 태스크 흐름 (플로팅 매니저)

```
useReportAI/useDailyShare
  ↓ ai.run() → jobId 반환
aiTaskStore.addTask({ jobIds: [jobId], status: 'running' })
  ↓ useAITaskListener
ai:chunk → appendChunk (result 누적)
ai:done → markJobDone (status: 'done')
  ↓ 사용자가 FloatingAIButton → AITaskPanel → 태스크 클릭
AITaskDetailModal (SectionPresenter로 결과 표시, 리포트 저장)
```
