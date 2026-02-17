# 리포트 페이지 단일 책임 리팩토링

> 날짜: 2026-02-14
> 상태: 완료

## 1. 문제 정의

기존 `ReportsPage`와 `useReportActions` 훅이 너무 많은 책임을 가지고 있었다.

- `useReportActions`: 130줄, 28개 반환값 — 필터, 프롬프트, 저장, AI 생성, JSON 다운로드를 모두 담당
- `ReportsPage`: 305줄 — 상세뷰, 프롬프트 섹션, 저장 폼, 목록, AI 모달을 하나의 컴포넌트에서 렌더링

이로 인해:
- 하나의 관심사를 변경할 때 관련 없는 코드도 함께 변경 위험
- 로직 재사용 불가
- 테스트 시 불필요한 의존성이 많아짐

## 2. 데이터 플로우

```
StoredData(Jira 이슈)
  │
  ▼
useReportFilter ─── assignee, startDate, endDate, filteredIssues
  │                        │                │
  ▼                        ▼                ▼
useReportPrompt     useReportAI       handleDownloadJson
  │                    │
  ▼                    ▼
ReportPromptSection  AIReportModal
```

- 데이터 원천: `useJiraIssues()` → `storedData.issues`
- 필터는 다른 훅의 입력이 됨 (filter → prompt, filter → AI)
- 저장은 독립적 (ReportSaveForm 내부에서 자체 관리)

## 3. 모듈별 역할

### Business Logic (utils/)
| 함수 | 역할 |
|------|------|
| `filterReportIssues()` | 담당자 + 기간으로 이슈 필터링 |
| `extractAssignees()` | 이슈 목록에서 고유 담당자 추출 |
| `buildReportPrompt()` | AI 프롬프트 텍스트 생성 |
| `buildIssueExportData()` | 이슈를 JSON 내보내기 형식으로 변환 |
| `getDefaultPeriod()` | 기본 기간 (7일) 계산 |
| `formatReportDate()` | ISO 날짜 → 표시 형식 변환 |
| `renderMarkdown()` | 마크다운 → HTML 변환 |

### UI Logic (hooks/)
| 훅 | 관심사 | 입력 | 출력 |
|----|--------|------|------|
| `useReportFilter` | 이슈 필터링 | issues | assignee, dates, filteredIssues |
| `useReportPrompt` | 프롬프트 생성/복사 | assignee, dates | promptText, copied, handleCopy |
| `useReportAI` | AI 리포트 생성 | filteredIssues, prompt, filter 값 | ai state, generate, save |

### UI (components/)
| 컴포넌트 | 역할 |
|----------|------|
| `ReportDetailView` | 리포트 상세 뷰 + 집중 모드 |
| `ReportPromptSection` | 필터 UI + 프롬프트 표시 + 액션 버튼 |
| `ReportSaveForm` | 수동 리포트 저장 (자체 상태 관리) |
| `ReportList` | 리포트 목록 + 삭제 |
| `AIReportModal` | AI 실행 상태 표시 + 결과 저장 |

### 조합 지점 (pages/)
| 페이지 | 역할 |
|--------|------|
| `ReportsPage` | 훅과 컴포넌트를 조합하는 지점. 로직 없음, 연결만 담당 |

## 4. 문제 격리 전략

각 관심사를 독립 모듈로 격리하여 변경 영향 범위를 최소화:

- **필터 변경**: `useReportFilter` + `filterReportIssues()` 만 수정
- **프롬프트 변경**: `useReportPrompt` + `buildReportPrompt()` 만 수정
- **AI 실행 변경**: `useReportAI` + `useAIRunner` 만 수정
- **저장 변경**: `ReportSaveForm` 내부만 수정 (한 곳에서만 사용되므로 훅 분리 불필요)
- **목록 UI 변경**: `ReportList` 만 수정

## 5. 예외 처리

| 영역 | 예외 케이스 | 처리 방식 |
|------|------------|-----------|
| 필터 | issues가 undefined | `issues ?? []`로 빈 배열 폴백 |
| 저장 | 제목/내용 미입력 | 버튼 disabled + early return |
| 저장 | API 실패 | try/finally로 saving 상태 복구 |
| 삭제 | confirm 취소 | early return |
| AI 실행 | CLI 미설치 | `ai.error` 상태 → AIReportModal에서 에러 표시 |
| AI 실행 | 실행 중 취소 | `ai.abort()` → SIGTERM |

## 6. 인터페이스 설계 근거

### 왜 useReportSave를 훅으로 분리하지 않았나?
- `ReportSaveForm`에서만 사용되는 단순 로직
- 외부와 상태를 공유할 필요 없음 (저장 후 쿼리 무효화만 하면 됨)
- 불필요한 추상화(premature abstraction) 방지

### 왜 useReportFilter가 useReportPrompt, useReportAI와 분리되었나?
- 필터 결과가 프롬프트와 AI의 입력으로 사용됨 → 의존 방향이 명확
- 필터 로직은 다른 페이지에서도 재사용 가능 (예: 대시보드)
- 각 훅이 독립적으로 테스트 가능

### 왜 AIReportModal의 타입을 useAIRunner에서 가져오나?
- 기존에는 `useReportActions`의 ReturnType에 의존 → 삭제된 훅에 대한 순환 의존
- `useAIRunner`는 AI 실행의 근본 인터페이스 → 직접 참조가 더 명확

## 7. 변경 전후 비교

### Before
```
ReportsPage (305줄) ← useReportActions (130줄, 28 반환값)
```

### After
```
ReportsPage (105줄, 조합 지점)
  ├── useReportFilter (필터)
  ├── useReportPrompt (프롬프트)
  ├── useReportAI (AI 생성)
  ├── ReportDetailView (상세)
  ├── ReportPromptSection (프롬프트 UI)
  ├── ReportSaveForm (저장, 자체 상태)
  ├── ReportList (목록)
  └── AIReportModal (AI 모달)
```
