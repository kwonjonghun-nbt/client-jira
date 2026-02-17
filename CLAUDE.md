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

### 검증된 라이브러리 우선 (Proven Solution First)

문제를 해결할 때 직접 구현하지 않고, **검증된 라이브러리(일반해)를 먼저 찾아 적용한다.** 동일한 문제가 반복될 때 매번 새로 찾지 않도록 아래 매핑을 따른다.

| 문제 영역 | 라이브러리 | 예시 |
|-----------|-----------|------|
| 날짜 파싱·포맷·계산 | `date-fns` | `format`, `differenceInDays`, `parseISO` |
| 배열·객체 유틸 함수 | `es-toolkit` | `groupBy`, `debounce`, `omit`, `chunk` |
| 유틸성 React 훅 | `usehooks-ts` | `useLocalStorage`, `useDebounce`, `useMediaQuery` |
| 폼 상태·유효성 관리 | `react-hook-form` | `useForm`, `Controller`, `useFieldArray` |
| 런타임 타입 검증·스키마 | `zod` | `z.object`, `z.infer`, `safeParse` |

**규칙:**
- JS 내장 API(`Date`, `Array.prototype`)로 직접 구현하기 전에 위 라이브러리에 해당 기능이 있는지 확인한다.
- 새로운 문제 영역이 발생하면 신뢰할 수 있는 라이브러리를 찾아 이 테이블에 추가한다.
- 프로젝트에 이미 설치된 라이브러리를 우선 사용하고, 같은 역할의 라이브러리를 중복 도입하지 않는다.

```typescript
// Good: date-fns 사용
import { formatDistanceToNow, parseISO } from 'date-fns';
const relative = formatDistanceToNow(parseISO(dateStr), { locale: ko });

// Bad: 직접 구현
const diff = Date.now() - new Date(dateStr).getTime();
const minutes = Math.floor(diff / 60000);
```

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

## 문서 관리

- 기능 추가/변경 커밋 후 관련 `docs/` 문서를 업데이트한다.
- 새로운 모듈(컴포넌트, 훅, 유틸)이 추가되면 해당 페이지/시스템 문서의 모듈 구성 테이블에 반영한다.
- IPC 채널이 추가되면 `docs/architecture.md`의 IPC 통신 테이블을 업데이트한다.
- 문서 구조는 `docs/PRODUCT.md`의 목차를 따른다.
- **커밋 완료 후 문서 점검**: 작업이 끝나면 변경 범위에 따라 `docs/` 문서 업데이트가 필요한지 확인하고, 필요 시 같은 세션에서 업데이트한다.

## 세션 관리 — 토큰 효율화

### 한 세션 한 목표

- 하나의 세션에서는 **하나의 목표**(기능 구현, 리팩토링, 버그 수정 등)만 수행한다.
- 서로 다른 종류의 작업(예: 문서 업데이트 → 새 기능 구현)을 한 세션에 섞지 않는다.
- 플랜과 구현은 **같은 세션**에서 연속으로 진행한다. 플랜만 하고 세션을 끊지 않는다.

### 큰 기능 분리 기준

기능이 커서 한 세션에 담기 어려울 때만 분리하며, **수직 슬라이스** 단위로 나눈다.

```
Good: 독립적으로 컴파일·테스트 가능한 단위
  세션1: 코어 로직 (utils + store + hooks + tests) → 커밋
  세션2: UI + 통합 + 기존 코드 수정 + 문서 → 커밋

Bad: 레이어별 분리 (매 세션마다 이전 코드를 다시 읽어야 함)
  세션1: 비즈니스 로직만
  세션2: 훅만
  세션3: 컴포넌트만
```

### 세션 시작 시 컨텍스트 최소화

- 이전 세션에서 이어받을 때, `git log`와 새로 만든 파일만 읽으면 작업을 재개할 수 있어야 한다.
- 각 세션의 결과물은 반드시 **커밋**으로 남겨서 다음 세션의 진입점이 된다.

## 설계 문서 선행 — 구현 전 리뷰

작업 요청을 받으면 **코드 작성 전에 설계 문서를 작성하여 사용자에게 공유**한다. 사용자 승인 후 구현을 시작한다.

### 설계 문서 작성 절차

1. **요구사항 구체화** — 요청을 분석하여 기능 범위, 입출력, 제약 조건을 명확히 정리한다.
2. **설계 문서 작성** — 아래 항목을 포함한 문서를 작성하여 사용자에게 공유한다.
3. **사용자 승인** — 설계 리뷰 후 승인을 받고 나서 구현에 착수한다.

### 설계 문서 필수 항목

| 항목 | 내용 |
|------|------|
| 요구사항 구체화 | 기능 목표, 범위, 입출력, 제약 조건 |
| 모듈 설계 | 각 모듈의 역할(해결하려는 문제)과 인터페이스(시그니처, 파라미터, 반환값) |
| 레이어 구조 | 어떤 레이어에 어떤 모듈이 추가/수정되는지 (Data → Business → Hook → State → UI) |
| 데이터 플로우 | 데이터가 어디서 생성되어 어디까지 흐르는지 다이어그램 |
| 사이드이펙트 관리 | IPC 호출, API 요청, 타이머, 이벤트 리스너 등 부수효과 목록과 관리 방법 |
| 기존 코드 영향 | 수정이 필요한 기존 파일 목록, 변경 사항, breaking change 여부, 파급 범위 |
| 테스트 계획 | 어떤 함수/로직을 어떻게 테스트할지 |
| 의사결정 기록 | 대안이 있었을 경우, 선택한 방식과 그 이유를 커밋 메시지 body에 기록 |

### 작업 규모별 설계 범위

- **설계 생략** (오타 수정, 스타일 변경, 원인이 명확한 1줄 버그 픽스): 설계 문서 없이 바로 수정
- **소규모** (파일 1~2개, 단일 레이어): 요구사항 구체화 + 모듈 설계 + 테스트 계획
- **중규모 이상** (파일 3개+, 복수 레이어): 전체 항목
