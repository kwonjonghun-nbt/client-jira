# Client Jira - Development Guide

## Architecture: Layered Interface Composition

모든 로직은 **5개 레이어**로 분리한다. 각 레이어는 자기 목표 하나만 담당하며, 레이어 간 의존은 아래 방향(Data → UI)으로만 허용한다.

```
┌─────────────────────────────────────────────┐
│  UI Layer          컴포넌트 렌더링만 담당      │
│  (components/, pages/)                       │
├─────────────────────────────────────────────┤
│  State Layer       상태 저장·구독·전파         │
│  (store/)                                    │
├─────────────────────────────────────────────┤
│  UI Logic Layer    화면 파생값·이벤트 핸들링    │
│  (hooks/)                                    │
├─────────────────────────────────────────────┤
│  Business Logic    도메인 규칙·변환·검증        │
│  (services/, utils/)                         │
├─────────────────────────────────────────────┤
│  Data Layer        스키마·타입·외부 통신        │
│  (schemas/, types/, ipc/)                    │
└─────────────────────────────────────────────┘
```

### 1. Data Layer — 데이터 정의와 외부 통신

| 디렉토리 | 역할 |
|----------|------|
| `schemas/` | Zod 스키마, 타입 정의, 유효성 검증 |
| `types/` | 공유 TypeScript 인터페이스 |
| `ipc/` | Main↔Renderer IPC 채널 정의, 외부 API 호출 |

**규칙:**
- 순수 데이터 구조만 정의한다. 로직을 포함하지 않는다.
- 스키마가 곧 single source of truth — 타입은 스키마에서 추론(`z.infer`)한다.
- IPC 핸들러는 데이터 전달만 하고, 가공은 Business Logic에 위임한다.

### 2. Business Logic Layer — 도메인 규칙

| 디렉토리 | 역할 |
|----------|------|
| `main/services/` | Main 프로세스 비즈니스 로직 (수집, 동기화, 저장) |
| `main/utils/` | 순수 변환 함수 (normalize, diff 등) |
| `renderer/utils/` | Renderer 순수 유틸 |

**규칙:**
- **순수 함수로 작성한다.** 입력→출력이 예측 가능해야 한다.
- React, Electron API, 전역 상태에 의존하지 않는다.
- 하나의 함수는 하나의 변환/검증/계산만 담당한다.
- 테스트는 이 레이어를 직접 import하여 검증한다.

```typescript
// Good: 순수 함수, 단일 책임
function calcKRProgress(kr: OKR_KR, issues: Map<string, NormalizedIssue>): number

// Bad: UI 상태와 비즈니스 로직 혼재
function calcAndSetProgress(kr: OKR_KR, setState: Function): void
```

### 3. UI Logic Layer — 화면 로직

| 디렉토리 | 역할 |
|----------|------|
| `hooks/` | 커스텀 훅 — 이벤트 핸들링, 파생값 계산, 부수효과 조율 |

**규칙:**
- 훅 하나는 **관심사 하나**만 담당한다 (드래그, 줌, 필터, CRUD 각각 분리).
- 비즈니스 로직은 직접 구현하지 않고 Business Logic Layer 함수를 호출한다.
- DOM 조작, 이벤트 리스너, 타이머 등 부수효과를 캡슐화한다.
- 훅이 반환하는 인터페이스는 최소한으로 유지한다.

```typescript
// Good: 관심사 하나, Business Logic 위임
function useCanvasTransform(viewportRef): { zoom, pan, setZoom, fitToView }
function useCanvasDrag(zoom, updateOKR): { dragInfo, startDrag }

// Bad: 여러 관심사 혼재
function useCanvas(): { zoom, pan, dragInfo, arrows, connectMode, tickets, groups, ... }
```

### 4. State Layer — 상태 관리

| 디렉토리 | 역할 |
|----------|------|
| `store/` | Zustand 스토어 — 전역 상태 저장과 구독 |

**규칙:**
- 스토어는 **상태 저장과 구독**만 담당한다. 비즈니스 로직을 넣지 않는다.
- 액션은 상태 갱신 최소 단위로 정의한다.
- 파생값(computed)은 훅에서 계산하거나 selector로 분리한다.

```typescript
// Good: 상태 저장만
interface JiraStore {
  issues: NormalizedIssue[];
  setIssues: (issues: NormalizedIssue[]) => void;
}

// Bad: 스토어에 비즈니스 로직
interface JiraStore {
  issues: NormalizedIssue[];
  fetchAndNormalizeIssues: () => Promise<void>; // 여기서 normalize까지 하지 않는다
}
```

### 5. UI Layer — 컴포넌트

| 디렉토리 | 역할 |
|----------|------|
| `components/` | 재사용 UI 컴포넌트 |
| `pages/` | 페이지 단위 컴포넌트 — 훅과 컴포넌트를 **조합** |

**규칙:**
- 컴포넌트는 **렌더링만** 담당한다. props를 받아 JSX를 반환한다.
- 이벤트 핸들러 로직은 훅에 위임하고, 컴포넌트는 연결만 한다.
- 페이지 컴포넌트는 훅들을 조합하여 기능을 완성하는 **조합 지점**이다.

```typescript
// Good: 페이지가 훅을 조합
function KRCanvasModal({ kr, okr, ... }) {
  const transform = useCanvasTransform(viewportRef);
  const drag = useCanvasDrag(transform.zoom, updateOKR);
  const relations = useCanvasRelations(okr, kr.id, transform.zoom);
  const tickets = useTicketActions(kr.id, updateOKR);
  const groups = useGroupActions(kr.id, updateOKR);

  return <Canvas>{/* 조합된 값과 함수를 컴포넌트에 전달 */}</Canvas>;
}
```

---

## 핵심 원칙

### 단일 책임 인터페이스 (Single-Purpose Interface)

각 모듈(함수, 훅, 컴포넌트)은 **하나의 목표**만 해결한다.

- 함수: 하나의 변환/계산/검증
- 훅: 하나의 관심사 (드래그, 줌, 필터 등)
- 컴포넌트: 하나의 시각적 단위

### 인터페이스 조합으로 기능 구현 (Composition over Monolith)

기능은 여러 단일 책임 인터페이스를 **조합**하여 구현한다.

```
기능 = Data(스키마) + Business(변환) + Hook(상태+효과) + Component(렌더링)
```

하나의 파일이 여러 레이어를 담당하게 되면 분리 시점이다.

### 의존 방향

```
Data ← Business ← UI Logic ← State ← UI
                                ↑        │
                                └────────┘ (구독)
```

- 상위 레이어가 하위 레이어를 import한다.
- 역방향 의존은 콜백/이벤트로 해결한다.
- 같은 레이어 간 import는 허용하되, 순환 참조를 만들지 않는다.

---

## 디렉토리 매핑

```
src/
├── main/
│   ├── schemas/      ← Data Layer
│   ├── ipc/          ← Data Layer
│   ├── services/     ← Business Logic
│   └── utils/        ← Business Logic
├── renderer/
│   ├── types/        ← Data Layer
│   ├── utils/        ← Business Logic
│   ├── store/        ← State Layer
│   ├── hooks/        ← UI Logic Layer
│   ├── components/   ← UI Layer
│   └── pages/        ← UI Layer (조합 지점)
└── shared/           ← Data Layer (Main/Renderer 공유 타입)
```

## 테스트 전략

- Business Logic → 순수 함수 단위 테스트 (vitest)
- UI Logic → 훅에서 추출한 순수 로직 단위 테스트
- UI → 필요 시 컴포넌트 테스트 (testing-library)
- `tests/` 디렉토리에 `*.test.ts` 파일로 작성
