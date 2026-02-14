# Client Jira

Jira 데이터를 로컬에 수집하여 대시보드, 타임라인, OKR 캔버스 등 다양한 뷰로 시각화하는 macOS 데스크톱 앱.

## 주요 기능

- **대시보드** — 프로젝트별 이슈 현황, 상태 분포, 담당자별 통계를 한눈에 확인
- **과제 목록** — 수집된 Jira 이슈를 검색, 필터링, 상세 조회
- **타임라인** — 이슈를 시간 기반 차트로 시각화
- **통계** — 프로젝트 데이터 기반 분석 차트
- **라벨 메모** — 라벨별 메모 작성 및 관리
- **리포트** — 데이터 기반 리포트 생성 및 저장
- **OKR 캔버스** — Objective/Key Result를 캔버스에 배치하고 Jira 이슈와 연결
- **자동 동기화** — 설정한 시간에 Jira 데이터를 자동으로 수집
- **자동 업데이트** — GitHub Releases를 통한 앱 내 업데이트 알림 및 설치

## 기술 스택

- **Electron** + **Electron Forge** (Vite 기반 빌드)
- **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Zustand** (상태 관리)
- **Zod** (스키마 검증)
- **electron-updater** (자동 업데이트)

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm

### 설치

```bash
git clone git@github.com:kwonjonghun-nbt/client-jira.git
cd client-jira
npm install
```

### 개발 모드 실행

```bash
npm start
```

### 빌드

```bash
npm run make
```

`out/` 디렉토리에 DMG, ZIP 파일이 생성됩니다.

## Jira 연결 설정

1. 앱 실행 후 **설정** 페이지로 이동
2. Jira 서버 URL, 이메일, API 토큰 입력
3. **연결 테스트** 버튼으로 확인
4. 수집할 프로젝트 선택
5. 동기화 스케줄 설정 (기본: 09:00, 13:00, 18:00)

> API 토큰은 [Atlassian 계정 설정](https://id.atlassian.com/manage-profile/security/api-tokens)에서 발급할 수 있습니다.

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm start` | 개발 모드 실행 |
| `npm run make` | 배포용 빌드 (DMG, ZIP) |
| `npm run publish` | GitHub Release 생성 |
| `npm run typecheck` | TypeScript 타입 체크 |
| `npm test` | 테스트 실행 |
| `npm run lint` | ESLint 실행 |
| `npm run format` | Prettier 포맷팅 |

## 배포

```bash
# .env 파일에 GITHUB_TOKEN 설정 필요
npm run publish
```

GitHub에 draft release가 생성되며, 확인 후 Publish하면 기존 사용자에게 자동 업데이트가 제공됩니다.

## 라이선스

MIT
