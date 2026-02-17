# Client Jira - 제품 문서

Jira 데이터를 수집하여 시각화하고, AI 기반 리포트를 생성하는 Electron 데스크톱 앱.

## 문서 구조

### 아키텍처

- [architecture.md](./architecture.md) — 기술 스택, 레이어 구조, 데이터 흐름

### 페이지

| 페이지 | 문서 | 설명 |
|--------|------|------|
| 대시보드 | [dashboard.md](./pages/dashboard.md) | 이슈 통계, 워크로드, 변경 추적, 이슈공유 |
| 과제 목록 | [issues.md](./pages/issues.md) | 이슈 테이블, 필터, 검색, 상세 모달 |
| 타임라인 | [timeline.md](./pages/timeline.md) | 간트 차트, 뷰 모드, 줌/스크롤 |
| 라벨 통계 | [stats.md](./pages/stats.md) | 라벨별 완료율, 테이블/차트 뷰 |
| 라벨 메모 | [label-notes.md](./pages/label-notes.md) | 라벨 의미·용도 기록 |
| 리포트 | [reports.md](./pages/reports.md) | AI 리포트 생성, 프롬프트, 저장 |
| OKR | [okr.md](./pages/okr.md) | 목표-KR 관리, 캔버스, Jira 연결 |
| 설정 | [settings.md](./pages/settings.md) | Jira 연결, 수집 대상, 스케줄, AI |

### 시스템

| 시스템 | 문서 | 설명 |
|--------|------|------|
| 동기화 | [sync.md](./systems/sync.md) | Jira API 수집, 정규화, 변경 추적 |
| AI Runner | [ai-runner.md](./systems/ai-runner.md) | CLI 백그라운드 실행, 스트리밍 |
| 저장소 | [storage.md](./systems/storage.md) | JSON 파일 기반 데이터 영속화 |
| 터미널 | [terminal.md](./systems/terminal.md) | node-pty 기반 대화형 터미널 |
