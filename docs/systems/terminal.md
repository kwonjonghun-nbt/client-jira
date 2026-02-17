# 터미널 시스템

## 개요

node-pty 기반 대화형 터미널 세션을 Renderer에서 사용할 수 있게 제공하는 시스템. xterm.js로 터미널 UI를 렌더링.

## 구성 요소

### TerminalService (`services/terminal.ts`)

Main 프로세스 서비스:

- `create(id, options)` — PTY 세션 생성
- `write(id, data)` — PTY에 입력 전달
- `resize(id, cols, rows)` — 터미널 크기 조절
- `destroy(id)` — PTY 세션 종료
- PTY stdout 데이터를 Renderer에 IPC 이벤트로 전송

### IPC 핸들러 (`ipc/terminal.handlers.ts`)

| 채널 | 방향 | 용도 |
|------|------|------|
| `terminal:create` | Renderer → Main | 세션 생성 |
| `terminal:write` | Renderer → Main | 입력 전달 |
| `terminal:resize` | Renderer → Main | 크기 조절 |
| `terminal:destroy` | Renderer → Main | 세션 종료 |
| `terminal:data` | Main → Renderer | PTY 출력 스트리밍 |

### terminalStore (`store/terminalStore.ts`)

- `aiType` — AI CLI 종류 (claude | gemini)
- 설정 페이지에서 변경 가능

> **Note:** Renderer 쪽 대화형 터미널 UI(`useTerminal`, `ClaudeTerminalPanel`, `TerminalPanel`, `useResizablePanel`)는 제거됨. 현재 터미널 시스템은 Main 프로세스의 PTY 서비스와 IPC 핸들러만 유지.

## 기술 스택

| 라이브러리 | 역할 |
|-----------|------|
| `node-pty` | 네이티브 PTY 프로세스 생성 |
