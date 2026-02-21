# Improvement Tracker

> 코드베이스 전체를 분석한 두 차례 전문가 리뷰 결과를 통합한 개선 아이템 목록.
> - **1차 (성능)**: UI/UX, Electron, 비즈니스 로직, 아키텍처, 프로덕트 전문가 5명
> - **2차 (코드 퀄리티)**: 아키텍처, 비즈니스 로직, 테스트/QA, 코드 리뷰, 비판 전문가 5명
>
> 각 항목은 우선순위(Phase)별로 정렬되어 있으며, 완료 시 체크박스를 표기한다.
> 항목 ID의 접두어: `P` = 성능, `Q` = 코드 퀄리티, `U` = UX

---

## Phase 1 — CRITICAL: 안전망 (즉시 수정)

> 보안, 데이터 무결성, 타입 안전성에 직결되는 항목. 기능 추가보다 우선.

### 타입 안전성

- [x] **Q1-1. `AppServices` 인터페이스 `any` 타입 제거**
  - 파일: `src/main/services/types.ts:10-22`
  - 문제: 11/13 필드가 `any`. 모든 IPC 핸들러의 서비스 호출에 타입 체크가 작동하지 않음. 메서드 오타, 리턴 타입 변경, 삭제된 서비스 — 컴파일 타임에 잡히지 않음
  - 해결: 실제 서비스 타입 import (`StorageService | null`, `SyncService | null` 등)
  - 영향: 전체 IPC 레이어 타입 안전성 확보

### 데이터 무결성

- [x] **Q1-2. Storage 검증 실패 시 무효 데이터 저장/로드 차단**
  - 파일: `src/main/services/storage.ts:40-57`
  - 문제: Zod 검증 실패 시 경고 로그만 남기고 무효 데이터를 그대로 저장. 로드 시에도 `as Settings`로 캐스팅. 검증 레이어가 장식에 불과
  - 해결: `saveSettings`에서 무효 데이터는 reject + throw. `loadSettings`에서는 디폴트 merge 전략 적용
  - 영향: 설정 데이터 오염 방지, 다운스트림 런타임 에러 예방

### 보안

- [x] **Q1-3. 디버그 로그에서 민감 데이터 노출 제거**
  - 파일: `src/main/ipc/settings.handlers.ts:13,23`
  - 문제: `JSON.stringify(result)`로 OAuth clientSecret, Slack botToken이 평문 로깅
  - 해결: 디버그 로그 제거 또는 민감 필드 마스킹
  - 영향: 자격 증명 노출 차단

- [x] **Q1-4. OAuth `clientSecret` → CredentialsService 이동**
  - 파일: `src/main/schemas/settings.schema.ts:67`
  - 문제: Jira 토큰과 Gmail refresh token은 `safeStorage`(OS keychain)로 보호하면서, `clientSecret`은 `settings.json` 평문 저장
  - 해결: `CredentialsService.saveGmailClientSecret()` 추가, `safeStorage` 사용
  - 영향: OAuth 자격 증명 보호

- [x] **Q1-5. Slack `botToken` → CredentialsService 이동**
  - 파일: `src/main/schemas/settings.schema.ts:49`
  - 문제: `xoxb-...` 형태의 Slack 봇 토큰이 `settings.json` 평문 저장
  - 해결: `CredentialsService`로 이동
  - 영향: Slack 봇 토큰 보호

- [x] **Q1-6. Report get/delete 경로 순회(Path Traversal) 차단**
  - 파일: `src/main/services/storage.ts:188-211`
  - 문제: `getReport`/`deleteReport`가 파일명을 sanitize하지 않음. `../../settings.json` 같은 입력으로 임의 파일 접근 가능. `saveReport`는 sanitize 적용되어 있어 불일치
  - 해결: resolved 경로가 `getReportsDir()` 내부인지 검증
  - 영향: 파일 시스템 접근 제한

---

## Phase 2 — HIGH: 아키텍처 정합성 + 체감 성능 (1-3일)

> 레이어 경계 복원, 순환 의존 해소, 타입 중복 제거 + 사용자 체감 성능 최대 효과 항목.

### 아키텍처 위반 수정

- [x] **Q2-1. IPC 핸들러 → 서비스 위임으로 정리**
  - 파일: `src/main/ipc/email.handlers.ts:36-68`, `src/main/ipc/slack.handlers.ts:10-21`
  - 문제: `email:send-report` 핸들러가 5단계 오케스트레이션(리포트 로드 → 설정 로드 → 검증 → HTML 빌드 → 전송)을 직접 수행. Slack 핸들러도 설정 로드/검증 포함
  - 해결: `EmailService.sendReportEmail(params)` 메서드로 추출. Slack 설정 검증은 스케줄러 내부로 이동
  - 영향: IPC 레이어가 순수 라우팅으로 복원

- [x] **Q2-2. `reinitializeJiraServices` 순환 의존 해소**
  - 파일: `src/main/ipc/sync.handlers.ts:3`, `src/main/ipc/settings.handlers.ts:3`
  - 문제: IPC 핸들러가 앱 엔트리 포인트(`../index`)에서 import → IPC→index→IPC 순환 경로
  - 해결: `services/service-initializer.ts`로 추출
  - 영향: 모듈 경계 정상화

- [x] **Q2-3. Main↔Renderer 공유 타입 도입 (345줄 중복 제거)**
  - 파일: `src/renderer/types/jira.types.ts` (269줄), `src/renderer/types/settings.types.ts` (76줄)
  - 문제: Renderer 타입이 Main 스키마의 수동 복사본. 자동 동기화 없어 drift 위험
  - 해결: `src/shared/types/`에서 `z.infer<typeof Schema>` export, 양쪽에서 import. Renderer 전용 타입(CanvasChange 등)은 `renderer/types/`에 유지
  - 영향: single source of truth 복원, 345줄 중복 제거

### 에러 처리

- [x] **Q2-4. `retry()` 에러 분류 추가**
  - 파일: `src/main/utils/retry.ts`
  - 문제: 401(인증 실패), 404(미존재) 등 4xx 에러도 지수 백오프로 3회 재시도. 7초 낭비 + Jira rate limit 트리거 위험
  - 해결: 4xx (429 제외)는 즉시 throw, 5xx/네트워크 오류만 재시도
  - 영향: 인증 에러 시 즉시 피드백

### 렌더링 성능

- [x] **P2-5. Canvas 드래그 시 `recalcArrows` 분리**
  - 파일: `src/renderer/hooks/okr/useCanvasDrag.ts:56-59`, `src/renderer/hooks/okr/useCanvasRelations.ts:42-71`
  - 문제: 드래그 중 매 rAF 프레임마다 `recalcArrows()` 호출 → 모든 카드에 `getBoundingClientRect()` → 20+ 강제 레이아웃/초
  - 해결: 드래그 중 `recalcArrows` 제거, 드롭 완료 후 1회만 실행
  - 영향: Canvas 카드 드래그 jank 해소

- [x] **P2-6. React.lazy + Suspense 전 페이지 적용**
  - 파일: `src/renderer/App.tsx:1-37`
  - 문제: 8개 페이지 모두 정적 import. `React.lazy()` 0건
  - 해결: 모든 페이지에 `React.lazy()` + `<Suspense fallback={<Spinner />}>` 적용
  - 영향: 초기 로드 -40~60%

- [x] **P2-7. IssueTable/IssueRow `React.memo` 적용**
  - 파일: `src/renderer/components/issue/IssueRow.tsx`, `src/renderer/components/issue/IssueTable.tsx`
  - 문제: `memo()` 없음. 부모 상태 변경 시 전체 행 리렌더
  - 해결: `IssueRow`, `IssueTable` `memo()` 래핑, `openIssueDetail`를 부모에서 prop으로 전달
  - 영향: 이슈 목록 불필요한 리렌더 제거

- [x] **P2-8. TimelineChart 가상화(Virtualization)**
  - 파일: `src/renderer/components/timeline/TimelineChart.tsx:394-568`
  - 문제: `displayNodes` 전체를 DOM에 렌더링. 200+ 이슈 시 400+ DOM 노드
  - 해결: `@tanstack/react-virtual` 도입
  - 영향: 200+ 이슈 스크롤 정상화

### 번들 & 빌드

- [x] **P2-9. `googleapis` → `@googleapis/gmail` 교체**
  - 파일: `src/main/services/email.ts:2`, `package.json:58`
  - 문제: 500+ Google API 클라이언트 포함 (194MB). gmail.send 1개만 사용
  - 해결: `@googleapis/gmail` 단독 패키지로 교체 (~2-5MB)
  - 영향: 앱 패키지 크기 -180MB

- [x] **P2-10. Vite `manualChunks` + `build.target` 설정**
  - 파일: `vite.renderer.config.ts`
  - 해결: `manualChunks` (react, query, zustand, date-fns 분리), `build.target: 'chrome130'`
  - 영향: 캐싱 개선, 트랜스파일 비용 제거

- [x] **P2-11. 미사용 `@toss/utils` 의존성 제거**
  - 파일: `package.json:52`
  - 문제: import 0건. 25MB 설치 크기
  - 해결: `npm uninstall @toss/utils`
  - 영향: 설치 크기 -25MB

---

## Phase 3 — HIGH~MEDIUM: 코드 구조 + 알고리즘 (1-2주)

> 응집도/결합도 개선, god function 분해, 순수성 복원, 알고리즘 최적화.

### 응집도/결합도 개선

- [x] **Q3-1. `useOKRActions` 훅 분리 (302줄, 반환값 30개)**
  - 파일: `src/renderer/hooks/useOKRActions.ts`
  - 문제: collapse 상태, 인라인 편집, 추가 폼, CRUD, 모달 상태가 하나의 훅에 혼재
  - 해결: `useOKRCrud`, `useOKRInlineEdit`, `useOKRCollapse`, `useOKRLinking`으로 분리
  - 영향: 단일 책임 원칙 복원, 테스트 용이성

- [x] **Q3-2. `TimelineChart` 메가 컴포넌트 분해 (620줄)**
  - 파일: `src/renderer/components/timeline/TimelineChart.tsx`
  - 문제: `buildTree`, `computeRange`, localStorage 영속화, 스크롤 동기화, 패널 리사이즈, 드래그 재정렬이 모두 컴포넌트 내부
  - 해결: `buildTree`/`computeRange` → `utils/timeline.ts`, 스크롤/리사이즈 → 커스텀 훅, 컴포넌트는 조합만
  - 영향: 620줄 → ~150줄, 유지보수성 대폭 향상

- [x] **Q3-3. `useTimelineControls` 훅 분리 (반환값 27개)**
  - 파일: `src/renderer/hooks/useTimelineControls.ts`
  - 문제: 뷰 모드, 줌, 날짜 필터, 이슈 타입 필터, 설정 드롭다운, 패널 토글 등 혼재
  - 해결: `useTimelineFilters(issues)` + `useTimelineViewport()`로 분리
  - 영향: 관심사 분리

- [x] **Q3-4. `aiTaskStore` 비즈니스 로직 추출**
  - 파일: `src/renderer/store/aiTaskStore.ts:84-148`
  - 문제: 멀티잡 완료 판정, 결과 머지 로직이 스토어에 존재. 아키텍처 규칙("스토어는 상태 저장/구독만") 위반
  - 해결: `utils/ai-tasks.ts`에 `resolveTaskStatus()` 순수 함수로 추출
  - 영향: 스토어 레이어 정합성 복원

- [x] **Q3-5. `uiStore`에서 전체 `NormalizedIssue` 저장 제거**
  - 파일: `src/renderer/store/uiStore.ts:19`
  - 문제: 전체 도메인 객체를 UI 스토어에 저장 → 싱크 후 stale 데이터 위험
  - 해결: `selectedIssueKey: string | null`만 저장, React Query 캐시에서 resolve
  - 영향: UI/데이터 레이어 결합도 감소

### God Function 분해

- [x] **Q3-6. `mergeCanvasChanges` 분해 (170줄)**
  - 파일: `src/renderer/utils/ai-canvas.ts:273-450`
  - 문제: 그룹/링크/가상티켓/관계 변경을 하나의 함수에서 처리
  - 해결: `applyGroupChanges`, `applyLinkChanges`, `applyVirtualTicketChanges`, `applyRelationChanges`로 분리 후 조합
  - 영향: 단일 책임, 독립 테스트 가능

- [x] **Q3-7. `buildReportEmailHtml` 분해 (110줄)**
  - 파일: `src/main/utils/email.ts:23-141`
  - 문제: 7가지 마크다운 구문 변환을 하나의 for 루프에서 처리
  - 해결: `parseHeading`, `parseTable`, `parseBlockquote` 등 개별 핸들러로 추출
  - 영향: 각 변환 규칙 독립 테스트 가능

- [x] **Q3-8. `DailyReportScheduler.generateAndSendReports` 분리 (125줄)**
  - 파일: `src/main/services/daily-report-scheduler.ts:69-193`
  - 문제: 구조화 리포트(thread 모드)와 AI 리포트(webhook 모드) 두 경로가 하나의 메서드에 혼재
  - 해결: `sendStructuredThreadReports()` + `sendAIWebhookReports()`로 분리
  - 영향: 단일 책임

### 순수성 복원

- [x] **Q3-9. Utils 레이어에서 Electron/DOM API 사용 제거**
  - 파일: `src/main/utils/notification.ts`, `src/main/utils/paths.ts`, `src/renderer/utils/issue-prompts.ts:210-219`
  - 문제: `notification.ts`에 Electron `Notification` import, `paths.ts`에 `app.getPath()`, `issue-prompts.ts`에 `document.createElement`
  - 해결: 사이드이펙트 함수는 서비스/훅으로 이동, 순수 변환 로직만 utils에 유지
  - 영향: 비즈니스 로직 레이어 순수성 보장

- [x] **Q3-10. `new Date()` 내부 호출로 인한 불순 함수 수정**
  - 파일: `src/renderer/utils/daily-share.ts`, `src/renderer/utils/formatters.ts`, `src/renderer/utils/dashboard.ts`, `src/renderer/utils/stats.ts`
  - 문제: 같은 입력에 다른 결과를 반환하여 테스트 신뢰도 저하
  - 해결: `now?: Date` 파라미터로 주입 가능하게 변경 (기본값 `new Date()`)
  - 영향: 순수 함수 원칙 복원, 테스트 결정성 확보

### DRY 위반 수정

- [x] **Q3-11. 마크다운→HTML 변환 로직 통합**
  - 파일: `src/main/utils/email.ts:23-141`, `src/renderer/utils/reports.ts:19-116`
  - 문제: 거의 동일한 마크다운 파서가 두 곳에 존재 (inline styles vs Tailwind classes만 다름)
  - 해결: 공유 파서 + 스타일 전략(strategy) 패턴
  - 영향: 마크다운 파싱 변경 시 한 곳만 수정

- [x] **Q3-12. 날짜 프리셋 로직 통합**
  - 파일: `useDashboardStats.ts`, `useStatsPage.ts`, `useTimelineControls.ts`
  - 문제: 동일한 `applyDatePreset` / `applyPreset` 로직이 3개 훅에 중복
  - 해결: `useDatePreset()` 훅 또는 `computeDatePresetRange()` 유틸로 통합
  - 영향: 날짜 프리셋 비즈니스 규칙을 한 곳에서 관리

### 결합도

- [x] **Q3-13. `DailyReportScheduler`의 `claudeAgent` 하드코딩 제거**
  - 파일: `src/main/services/daily-report-scheduler.ts:196-199`
  - 문제: 사용자가 Gemini를 설정해도 데일리 리포트는 항상 Claude로 생성
  - 해결: 생성자에 `AIAgent` 주입 또는 사용자 설정 참조
  - 영향: AI 에이전트 선택 일관성

### 인터페이스 명확성

- [x] **Q3-14. `OKRLink` flat optional → discriminated union**
  - 파일: `src/renderer/types/jira.types.ts:134-144`
  - 문제: `type: 'jira'`일 때 `issueKey`가 required여야 하지만 optional. 소비자가 `l.issueKey!` 비-null 단언 남발
  - 해결: `OKRJiraLink | OKRVirtualLink` discriminated union
  - 영향: 타입 시스템이 유효하지 않은 조합을 컴파일 타임에 차단

### 알고리즘 최적화

- [x] **P3-15. OKR O(n²) 패턴 → Map/Set 사전 구축**
  - 파일: `src/renderer/utils/okr.ts:88`, `src/renderer/utils/okr-canvas-operations.ts:126`
  - 문제: `buildOKRExportData` O(O×KR×L) 중첩 filter/find, `hitTestGroup` O(n² log n)
  - 해결: 루프 전에 Map/Set 사전 구축 → O(1) 조회
  - 영향: 캔버스 데이터 처리 5-10x 개선

- [x] **P3-16. `computeDashboardStats` 단일 패스 통합**
  - 파일: `src/renderer/utils/dashboard.ts:116-159`
  - 문제: 9회 배열 순회 + 9개 중간 배열 할당
  - 해결: 단일 패스 누적기 + Schwartzian transform
  - 영향: 배열 순회 9→1회

- [x] **P3-17. `applyFilters`/`extractFilterOptions` 단일 패스 + Set**
  - 파일: `src/renderer/utils/issue-filters.ts:21-57`
  - 문제: 4회 체인 filter + `includes()` 사용
  - 해결: 단일 패스 combined predicate + Set 기반 조회
  - 영향: 검색 입력 반응성 개선

### 확장성

- [x] **Q3-18. OKR 변경 시 낙관적 업데이트 + debounced save**
  - 파일: `src/renderer/hooks/useOKRActions.ts:48-56`, `src/renderer/hooks/useOKR.ts:12-15`
  - 문제: 카드 드래그 한 번에 전체 OKR 트리 JSON 직렬화→IPC→Zod 검증→fs.writeFile→refetch 전체 사이클
  - 해결: `queryClient.setQueryData`로 즉시 UI 업데이트 + debounced save (500ms). refetch 제거
  - 영향: 캔버스 조작 반응성 대폭 개선

- [x] **Q3-19. AI 청크 스트리밍 상태 갱신 버퍼링**
  - 파일: `src/renderer/store/aiTaskStore.ts:65-82`
  - 문제: 매 청크마다 Zustand 상태 갱신 → 초당 수백 리렌더
  - 해결: requestAnimationFrame 버퍼링 또는 ref 사용, Zustand는 done/error 시만 갱신
  - 영향: AI 응답 중 렌더링 부하 감소

### Electron 최적화

- [x] **Q3-20. AI 프로세스 스폰 방식 개선**
  - 파일: `src/main/utils/process-spawner.ts:30`
  - 문제: (1) `-l -i` 인터랙티브 로그인 셸로 `.zshrc` 전체 로딩 (500ms-2s 오버헤드). (2) 셸 커맨드 문자열 연결 → 잠재적 커맨드 인젝션. (3) `/bin/zsh` 하드코딩 → macOS 종속
  - 해결: `-i` 제거, spawn 인자 배열로 변경, `process.env.SHELL || '/bin/sh'` 사용
  - 영향: AI 실행당 500ms-2s 절약 + 보안 강화 + 크로스플랫폼

- [x] **P3-21. 데일리 리포트 AI 호출 병렬화**
  - 파일: `src/main/services/daily-report-scheduler.ts:149-173`
  - 문제: N명 담당자에 대해 순차 `await` → 최대 N × 120초
  - 해결: `Promise.allSettled`로 병렬 실행
  - 영향: 리포트 생성 시간 N배 → 1배

- [x] **Q3-22. 동시 파일 쓰기 보호 추가**
  - 파일: `src/main/services/storage.ts`
  - 문제: 싱크 중 설정 저장이 일어나면 JSON 파일 손상 가능
  - 해결: atomic write (temp→rename) + 설정 파일 쓰기 큐
  - 영향: 동시 접근 시 데이터 무결성 보장

### 기타 코드 품질

- [x] **Q3-23. `catch (error: any)` → `error: unknown` + narrowing**
  - 파일: 서비스 레이어 전반 (40+ 곳)
  - 해결: `unknown` + `instanceof Error` narrowing
  - 영향: 에러 처리 타입 안전성

- [x] **Q3-24. `OKRPage` 인라인 JSX 컴포넌트 추출 (480줄)**
  - 파일: `src/renderer/pages/OKRPage.tsx:170-445`
  - 해결: `ObjectiveCard`, `KRCard` 컴포넌트 추출
  - 영향: 페이지가 조합 지점 역할에 충실

- [x] **Q3-25. `IssueDetailModal` props 기반으로 전환**
  - 파일: `src/renderer/components/issue/IssueDetailModal.tsx:12-16`
  - 문제: props 0개, 전역 스토어에서 직접 구독 → 단독 테스트 불가
  - 해결: `issue`, `baseUrl`, `onClose`를 props로 받기
  - 영향: 컴포넌트 순수성, 테스트 가능성

- [x] **Q3-26. `CredentialsService` save/get 중복 로직 통합**
  - 파일: `src/main/services/credentials.ts:15-106`
  - 문제: `saveToken`/`getToken`과 `saveGmailToken`/`getGmailToken`이 파일 경로만 다른 동일 로직
  - 해결: `saveEncrypted(path, value)`, `readEncrypted(path)` private 헬퍼 추출
  - 영향: 새 토큰 타입 추가 시 중복 방지

---

## Phase 4 — 테스트 보강 (완료)

> ~~현재 테스트 18건은 순수 유틸 함수 중심.~~ → **29개 테스트 파일, 620개 테스트 케이스** 달성. 서비스 레이어, 인프라 유틸, 엣지케이스 전면 보강 완료.

### 누락 테스트 파일 신규 작성 (HIGH)

- [x] **T4-1. `retry.ts` 단위 테스트**
  - 파일: `tests/retry.test.ts` (19 tests)
  - 커버리지: 첫 시도 성공, N회 후 성공, 전체 소진 throw, 지수 백오프 딜레이, 4xx(400/401/403/404) 즉시 실패, 429 재시도, 5xx 재시도, 네트워크 에러, logger.warn 검증

- [x] **T4-2. 서비스 레이어 통합 테스트 (mock 기반)**
  - 파일: `tests/credentials.test.ts` (15), `tests/storage.test.ts` (15), `tests/sync.test.ts` (16) — 총 46 tests
  - 커버리지: CredentialsService(safeStorage 암호화, base64 폴백, 토큰 타입별 경로), StorageService(loadSettings, saveSettings, appendChangelog 500건 제한, validateReportPath 경로 탈출 방지, atomicWrite), SyncService(정상 동기화, 동시 접근 guard, diff→changelog, 에러 기록, 100건 히스토리 제한)

- [x] **T4-3. `process-spawner.ts` 단위 테스트**
  - 파일: `tests/process-spawner.test.ts` (10 tests)
  - 커버리지: 셸 감지, 환경변수 merge, stdin write/end, EPIPE 처리, kill 함수, 기본 env

### 기존 테스트 엣지케이스 보강 (MEDIUM)

- [x] **T4-4. `normalize.test.ts` 엣지케이스 추가**
  - 파일: `tests/normalize.test.ts` (+9 tests, 총 25 tests)
  - 추가: reporter, dueDate, storyPoints=0, 빈 스프린트 배열, 문자열 description, 빈 ADF, components empty

- [x] **T4-5. `diff.test.ts` 엣지케이스 추가**
  - 파일: `tests/diff.test.ts` (+9 tests, 총 20 tests)
  - 추가: 삭제된 이슈 감지, null↔값 전환, storyPoints=0, 빈 배열, multi-field+resolution, resolution null→null

- [x] **T4-6. `ai-canvas.test.ts` 엣지케이스 추가**
  - 파일: `tests/ai-canvas.test.ts` (+8 tests, 총 30 tests)
  - 추가: 동일 그룹 update+delete 동시, 빈 changes 객체, 빈 배열, 존재하지 않는 ID, 복수 JSON 블록, 중첩 마크다운, relations-only

- [x] **T4-7. 미테스트 함수 커버리지 추가**
  - 파일: `tests/ai-tasks.test.ts` (+11 tests), `tests/stats.test.ts` (+6 tests), `tests/issue.test.ts` (+5 tests)
  - 추가: `countCompletedTasks`, `resolveJobDone`(단일/멀티), `resolveJobError`(단일/멀티/혼합), `matchPresetDays`(7/30/90일, 전체, 커스텀), `statusBadgeClass`, `getPriorityColor`

### 테스트 인프라 개선 (LOW)

- [x] **T4-8. `renderer-logic.test.ts` 파일 분리**
  - 668줄 단일 파일 → 6개 파일로 분리 (총 80 tests):
    - `tests/issue-filters.test.ts` (14) — `applyFilters`, `extractFilterOptions`
    - `tests/okr.test.ts` (12) — `calcKRProgress`, `calcObjectiveProgress`, `buildOKRExportData`
    - `tests/issue.test.ts` (19) — `normalizeType`, `getIssueTypeLabel`, `buildIssueUrl`, `statusBadgeClass`, `getPriorityColor`
    - `tests/formatters.test.ts` (14) — `formatRelativeTime`, `formatDateSafe`, `formatDateShort` 등
    - `tests/issue-prompts.test.ts` (9) — `getDescriptionTemplate`, `buildPrompt`
    - `tests/timeline.test.ts` (12) — `filterByDateRange`, `filterByRowTypes`, `extractIssueTypeOptions`

- [x] **T4-9. 공유 테스트 픽스처 추출**
  - 파일: `tests/fixtures.ts`
  - 내용: `makeIssue()`, `makeJiraIssue()`, `makeIssueMap()` 팩토리 + 공통 날짜 상수 통합

- [x] **T4-10. `downloadIssueJson` 테스트 실질화**
  - 파일: `tests/download.test.ts` (6 tests, jsdom 환경)
  - 커버리지: Blob 생성, createObjectURL→anchor click→revokeObjectURL 전체 플로우, 파일명 검증, JSON 직렬화 검증

---

## Phase 5 — 렌더링 & 상태 최적화 (중기)

### Canvas 렌더링 최적화

- [x] **P5-1. `renderCard` useCallback 의존성에서 `drag.dragInfo` 분리**
  - 파일: `src/renderer/components/okr/KRCanvasModal.tsx:156-205`
  - 해결: `dragInfo`를 ref로 분리, `JiraCard`/`VirtualCard`에 `React.memo`
  - 영향: 캔버스 드래그 중 카드 리렌더 제거

- [x] **P5-2. `GroupContainer` memo + 리사이즈 rAF 스로틀**
  - 파일: `src/renderer/components/okr/GroupContainer.tsx:283-301`
  - 해결: `requestAnimationFrame` 스로틀 + `memo()` 래핑
  - 영향: 그룹 리사이즈 부드러운 동작

- [x] **P5-3. `OKRPage` 진행률 계산 메모이제이션**
  - 파일: `src/renderer/pages/OKRPage.tsx:175-280`
  - 해결: `useMemo`로 `objectiveProgressMap`, `krProgressMap` 사전 계산
  - 영향: 불필요한 진행률 재계산 제거

- [x] **P5-4. Canvas SVG/배경 10,000×10,000px → 동적 크기**
  - 파일: `src/renderer/components/okr/KRCanvasModal.tsx:357-440`
  - 해결: 실제 콘텐츠 바운딩 박스에 맞춰 동적 크기 + `will-change: transform`
  - 영향: GPU 래스터화 부담 대폭 감소

- [x] **P5-5. `useCanvasRelations` 의존성 범위 축소**
  - 파일: `src/renderer/hooks/okr/useCanvasRelations.ts:133`
  - 해결: KR별 데이터 필터링 후 의존성 축소
  - 영향: 불필요한 ResizeObserver 재등록 방지

### 상태 & 데이터 패칭

- [x] **P5-6. `handlePanMouseDown` ref 기반 안정화**
  - 파일: `src/renderer/hooks/okr/useCanvasTransform.ts:37-60`
  - 해결: pan, zoom 값을 ref로 분리, `[connectMode]`만 의존
  - 영향: 뷰포트 이벤트 핸들러 안정화

- [x] **P5-7. `TimelineChart` 리사이즈 핸들러 ref 분리**
  - 파일: `src/renderer/components/timeline/TimelineChart.tsx:313-334`
  - 해결: `labelWidthRef` 사용, `useCallback([], fn)` 안정화
  - 영향: 타임라인 리사이즈 버벅임 해소

- [x] **P5-8. React Query `staleTime` 확장**
  - 파일: `src/renderer/index.tsx:10`
  - 해결: `staleTime: 5 * 60 * 1000` (5분) 또는 `Infinity`
  - 영향: 불필요한 IPC 라운드트립 제거

- [x] **P5-9. `useDashboardStats` memo 불필요 의존성 제거**
  - 파일: `src/renderer/hooks/useDashboardStats.ts:37`
  - 해결: `[filteredIssues]`만 유지
  - 영향: 대시보드 업데이트 시 중복 계산 제거

- [x] **P5-10. `toggleCollapse` / SVG 화살표 O(n²) 최적화**
  - 파일: `src/renderer/components/timeline/TimelineChart.tsx:291-298, 580-614`
  - 해결: `useCallback` 래핑 + `useMemo`로 `nodeIndexMap` 사전 구축
  - 영향: 타임라인 행 메모이제이션 기반 마련

---

## Phase 6 — Electron/Main 프로세스 최적화

- [ ] **P6-1. `terminal:write` invoke → send 변경**
  - 파일: `src/preload/preload.ts:119-122`
  - 해결: `ipcRenderer.send` (fire-and-forget) 변경
  - 영향: 터미널 입력 지연 제거

- [ ] **P6-2. Email OAuth 타이머 성공 시 해제**
  - 파일: `src/main/services/email.ts:57-59`
  - 해결: `clearTimeout` 추가
  - 영향: 불필요한 메모리 참조 제거

- [ ] **P6-3. Storage pretty-print + Zod 이중 검증 제거**
  - 파일: `src/main/services/storage.ts:62-85`
  - 해결: pretty-print 제거 (또는 dev only), 이미 검증된 데이터는 Zod 스킵
  - 영향: 파일 크기 -25%, 직렬화/검증 시간 절감

- [ ] **P6-4. `saveLatest` + `saveSnapshot` 병렬 쓰기**
  - 파일: `src/main/services/sync.ts:87-88`
  - 해결: `Promise.all([saveLatest, saveSnapshot])`
  - 영향: 싱크 쓰기 시간 -50%

- [ ] **P6-5. `listReports` 순차 stat → 병렬화**
  - 파일: `src/main/services/storage.ts:173-183`
  - 해결: `Promise.all(mdFiles.map(...))`
  - 영향: 리포트 목록 로딩 병렬화

- [ ] **P6-6. `normalizeIssues` ADF 변환 캐싱**
  - 파일: `src/main/utils/normalize.ts:7-14`
  - 해결: `issueKey:updated` 키 기반 모듈 레벨 캐시
  - 영향: 싱크당 ADF 변환 ~99% 절감

---

## Phase 7 — UX/사용성 개선

### CRITICAL UX

- [ ] **U7-1. 글로벌 토스트/알림 시스템 도입**
  - 문제: 성공/실패 피드백 없이 작업 수행
  - 해결: `react-hot-toast` 또는 Zustand 기반 토스트 시스템
  - 영향: 모든 mutation에 일관된 피드백 제공

- [ ] **U7-2. `window.confirm()` → 커스텀 확인 모달 + undo**
  - 파일: `ReportsPage.tsx:35`, `useOKRActions.ts:74,124`, `useGroupActions.ts:80`, `useTicketActions.ts:105`
  - 해결: 커스텀 확인 모달 + 5초 undo 토스트
  - 영향: 데이터 안전성 + UX 일관성

### HIGH UX

- [ ] **U7-3. 스켈레톤 로딩 도입**
  - 해결: 페이지별 스켈레톤 컴포넌트
  - 영향: 체감 속도 대폭 개선

- [ ] **U7-4. 필터 상태 페이지 이동 시 영속화**
  - 해결: Zustand에 페이지별 필터 상태 저장
  - 영향: 페이지 간 워크플로우 효율 개선

- [ ] **U7-5. Canvas 온보딩/도움말 추가**
  - 해결: 첫 사용 시 툴팁 투어 또는 `?` 도움말 오버레이
  - 영향: 기능 발견성 향상

- [ ] **U7-6. 이슈 키 클릭 → 상세 모달 (외부 브라우저 대신)**
  - 해결: 키 클릭 → 상세 모달, "Jira에서 보기"는 모달 내부로
  - 영향: 인앱 워크플로우 유지

- [ ] **U7-7. Error Boundary 추가**
  - 해결: 페이지 단위 Error Boundary
  - 영향: 앱 안정성 확보

### MEDIUM UX

- [ ] **U7-8. 접근성(a11y) 개선**
  - 해결: 모달 포커스 트랩, `role="navigation"`, `aria-current`, 아이콘 버튼 `aria-label`
  - 영향: 키보드/스크린리더 접근성

- [ ] **U7-9. 빈 상태(Empty State) UI 통일**
  - 해결: 공용 `EmptyState` 컴포넌트
  - 영향: UI 일관성

- [ ] **U7-10. 사이드바 아이콘 SVG 교체 + 기본 확장**
  - 해결: SVG 아이콘 + 초기 확장 상태
  - 영향: 첫 사용 경험 개선

- [ ] **U7-11. 낙관적 업데이트(Optimistic Update) 적용**
  - 해결: 로컬 mutation에 React Query `onMutate`/`onError`/`onSettled`
  - 영향: 로컬 작업 즉시 반영

- [ ] **U7-12. SyncProgress 오버레이 위치 충돌 해결**
  - 파일: `src/renderer/components/sync/SyncProgress.tsx:25`
  - 해결: z-index/위치 조정 또는 StatusBar 통합
  - 영향: Timeline 페이지 조작성

---

## 완료 이력

| 날짜 | 항목 | 비고 |
|------|------|------|
| 2026-02-21 | Q1-1 | `AppServices` 11개 `any` → 실제 서비스 타입으로 교체 |
| 2026-02-21 | Q1-2 | `saveSettings` 검증 실패 시 throw, `loadSettings` 디폴트 merge 전략 |
| 2026-02-21 | Q1-3 | `settings.handlers.ts` 디버그 로그 5건 제거 |
| 2026-02-21 | Q1-4 | `clientSecret` → `CredentialsService.saveGmailClientSecret()` (safeStorage) |
| 2026-02-21 | Q1-5 | `botToken` → `CredentialsService.saveSlackBotToken()` (safeStorage) |
| 2026-02-21 | Q1-6 | `validateReportPath()` 메서드 추가, path traversal 차단 |
| 2026-02-21 | Q2-1 | `EmailService.sendReportEmail()` 추출, Slack `triggerManual()` 추출. IPC 핸들러 순수 라우팅 복원 |
| 2026-02-21 | Q2-2 | `services/service-initializer.ts`로 추출, IPC→index 순환 의존 해소 |
| 2026-02-21 | Q2-3 | `src/shared/types/` 도입, Main 스키마 re-export. Renderer 타입 345줄 중복 제거 |
| 2026-02-21 | Q2-4 | `isNonRetryableError()` 추가, 4xx(429 제외) 즉시 throw |
| 2026-02-21 | P2-5 | 드래그 중 `recalcArrows` 제거, 드롭 완료 시 1회만 호출 |
| 2026-02-21 | P2-6 | 8개 페이지 `React.lazy()` + `<Suspense>` 적용 |
| 2026-02-21 | P2-7 | `IssueRow`, `IssueTable` `memo()` 래핑 |
| 2026-02-21 | P2-8 | `@tanstack/react-virtual` `useVirtualizer` 적용 (라벨+차트 패널) |
| 2026-02-21 | P2-9 | `googleapis` → `@googleapis/gmail` + `google-auth-library` 교체 (-180MB) |
| 2026-02-21 | P2-10 | `manualChunks` (react, zustand, date-fns, react-query), `build.target: 'chrome130'` |
| 2026-02-21 | P2-11 | `npm uninstall @toss/utils` (-25MB) |
| 2026-02-21 | Q3-1 | `useOKRActions` → `useOKRCollapse` + `useOKRInlineEdit` + `useOKRCrud` 분리, 원본은 조합 훅 |
| 2026-02-21 | Q3-2 | `TimelineChart` 635→425줄. `utils/timeline.ts` + `useScrollSync`/`usePanelResize`/`useTimelineDragSort` 추출 |
| 2026-02-21 | Q3-3 | `useTimelineControls` → `useTimelineFilters` + `useTimelineViewport` 분리 |
| 2026-02-21 | Q3-5 | `selectedIssue: NormalizedIssue` → `selectedIssueKey: string`, React Query 캐시에서 resolve |
| 2026-02-21 | Q3-6 | `mergeCanvasChanges` → 4개 private 함수로 분해 (group/link/vt/relation) |
| 2026-02-21 | Q3-7 | `buildReportEmailHtml` → shared `parseMarkdown` + handler chain 패턴 (Q3-11과 통합) |
| 2026-02-21 | Q3-8 | `generateAndSendReports` → `sendStructuredThreadReports` + `sendAIWebhookReports` 분리 |
| 2026-02-21 | Q3-9 | `notification.ts`/`paths.ts` → services 이동, `downloadIssueJson` → `utils/download.ts` 분리 |
| 2026-02-21 | Q3-11 | `src/shared/utils/markdown-parser.ts` 공유 파서 + `MarkdownStyleStrategy` 전략 패턴 |
| 2026-02-21 | Q3-12 | `computeDatePresetRange()` 유틸 추출, 3개 훅 중복 제거 |
| 2026-02-21 | Q3-14 | `OKRLinkSchema` → `z.discriminatedUnion('type', [...])`, `isJiraLink` 타입 가드 추가 |
| 2026-02-21 | Q3-18 | `useOKR` 낙관적 업데이트 (onMutate/onError/onSettled) + `useOKRActions` debounced save (500ms) |
| 2026-02-21 | Q3-24 | `ObjectiveCard`, `AddObjectiveForm`, `OKREmptyState` 컴포넌트 추출, OKRPage 480→183줄 |
| 2026-02-21 | P5-1 | `renderCard` useCallback에서 `drag.dragInfo` 제거, isDragging 스타일 wrapper div로 이동. `JiraCard`/`VirtualCard` `memo()` 래핑 |
| 2026-02-21 | P5-2 | `GroupContainer` `memo()` 래핑 + 리사이즈 핸들러 `requestAnimationFrame` 스로틀 |
| 2026-02-21 | P5-3 | `objectiveProgressMap` `useMemo` 사전 계산, 렌더 루프 내 `calcObjectiveProgress` 반복 호출 제거 |
| 2026-02-21 | P5-4 | Canvas 10000×10000px → `canvasSize` useMemo 동적 계산 + `will-change: transform` |
| 2026-02-21 | P5-5 | `useCanvasRelations` — `krLinks`/`krGroups` useMemo 사전 필터링, 다른 KR 변경 시 recalcArrows 재실행 방지 |
| 2026-02-21 | P5-6 | `handlePanMouseDown` — pan/zoom을 ref로 분리, 의존성 `[pan, zoom, connectMode]` → `[connectMode]` |
| 2026-02-21 | P5-7 | `TimelineChart` handleWheel — zoom을 `zoomRef`로 분리, 의존성 `[zoom, onZoomChange]` → `[onZoomChange]` |
| 2026-02-21 | P5-8 | React Query `staleTime` 30초 → 5분 (Electron IPC 기반 앱, 불필요 라운드트립 제거) |
| 2026-02-21 | P5-9 | `useDashboardStats` stats useMemo 의존성 `[issues, filteredIssues]` → `[filteredIssues]` |
| 2026-02-21 | P5-10 | `nodeIndexMap` useMemo(Map) 사전 구축으로 SVG 화살표 `findIndex` O(n²) → O(1). `toggleCollapse` useCallback 래핑 |

---

## 참고: 긍정적 발견 사항 (이미 잘 되어 있는 것)

### 성능
- 앱 시작: 페이즈별 lazy-loading 초기화 (core → window → network)
- 파일 I/O: 동기 파일 I/O 0건 — 전부 `fs/promises`
- CSS: Tailwind v4 자동 퍼징, 시스템 폰트
- 의존성 패턴: date-fns, es-toolkit 모두 named import (tree-shakable)

### 아키텍처
- Zod 스키마 → `z.infer` 타입 추론 패턴이 Main 프로세스에서 일관 적용
- Preload 브릿지가 깔끔한 pass-through로 유지
- 모듈 구조: barrel file 남용 없음
- 이벤트 리스너: 모든 `useEffect` 정리 함수 반환

### 코드 품질
- 순수 유틸 함수들(`anchor-points.ts`, `diff.ts`, `issue-filters.ts`, `status-transitions.ts`)이 모범적
- `KRCanvasModal`의 훅 조합 패턴이 프로젝트 아키텍처 원칙의 이상적 구현
- 한국어 테스트명이 훌륭한 Living Documentation 역할
- `date-fns`, `es-toolkit`, `zod` 등 검증된 라이브러리 우선 원칙 잘 준수

### 보안
- IPC 보안: `contextIsolation: true`, `nodeIntegration: false`, 동기 IPC 0건
- 보안 퓨즈: Electron Fuses 올바르게 설정
- 아이콘: SVG 컴포넌트 직접 관리 (react-icons 미사용)
