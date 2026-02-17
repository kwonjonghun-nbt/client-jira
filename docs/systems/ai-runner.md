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

## 사용처

| 페이지 | 기능 |
|--------|------|
| 리포트 | AI 리포트 생성 (`useReportAI`) |
| 대시보드 | AI 이슈공유 생성 (`useDailyShare`) |

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
