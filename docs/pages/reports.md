# 리포트 페이지

## 개요

Jira 이슈 기반 AI 리포트 생성, 프롬프트 관리, 리포트 저장·조회 기능을 제공하는 페이지.

## 기능

### 프롬프트 생성 섹션

- 담당자, 기간(시작일/종료일) 필터
- 필터된 이슈 기반 프롬프트 자동 생성
- 프롬프트 클립보드 복사
- 이슈 데이터 JSON 다운로드

### AI 리포트 생성

- "AI 생성" 버튼 → CLI 백그라운드 실행
- `AIReportModal`에서 생성 상태 표시 (스피너, 완료, 에러)
- 완료 후 "섹션별로 보기" (`SectionPresenter`) 또는 "바로 저장"
- 실행 중 "중단" 버튼

### 리포트 저장

- `ReportSaveForm` — 제목과 마크다운 콘텐츠 입력
- `.md` 파일로 저장
- AI 생성 결과 자동 저장 가능

### 리포트 목록

- 저장된 리포트 파일 목록 표시
- 클릭 시 상세 뷰 (`ReportDetailView`)
- 삭제 기능 (확인 다이얼로그)

### 리포트 상세 뷰

- 마크다운 렌더링
- 포커스 모드 (SectionPresenter) 전환

## 모듈 구성

| 레이어 | 모듈 | 역할 |
|--------|------|------|
| UI | `ReportsPage` | 훅 조합 및 레이아웃 (조합 지점) |
| UI | `ReportPromptSection` | 프롬프트 생성 UI |
| UI | `ReportSaveForm` | 리포트 저장 폼 (자체 상태) |
| UI | `ReportList` | 리포트 목록 |
| UI | `ReportDetailView` | 리포트 상세 뷰 |
| UI | `AIReportModal` | AI 생성 결과 모달 |
| UI | `SectionPresenter` | 섹션별 프레젠테이션 뷰 |
| UI Logic | `useReportFilter` | 담당자·기간 필터 |
| UI Logic | `useReportPrompt` | 프롬프트 생성·복사 |
| UI Logic | `useReportAI` | AI 리포트 생성·저장 |
| UI Logic | `useReports` | React Query 기반 리포트 목록/상세 조회 |
| UI Logic | `useAIRunner` | AI CLI 실행 상태 관리 |
| Business | `utils/reports` | buildReportPrompt, buildIssueExportData, renderMarkdown |
