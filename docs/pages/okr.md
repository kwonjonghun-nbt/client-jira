# OKR 페이지

## 개요

Objective-Key Result 프레임워크를 관리하고, 각 KR에 Jira 이슈를 연결하여 진행률을 추적하는 캔버스 기반 페이지.

## 기능

### Objective 관리

- Objective CRUD (추가, 수정, 삭제)
- 더블클릭 인라인 편집
- 접기/펼치기 (기본 접힘 상태)
- Objective 진행률 = 하위 KR 진행률 평균

### Key Result 관리

- KR CRUD (Objective 하위에 추가)
- KR 진행률 = 연결된 Jira 이슈 중 done 비율

### KR 캔버스 모달

KR을 클릭하면 전체 화면 캔버스 모달이 열림:

#### 작업 연결

- **Jira 이슈 연결**: 검색으로 기존 이슈 선택 (다중 선택)
- **가상 티켓 생성**: 제목, 타입, 담당자 입력으로 가상 작업 생성
- 연결 해제, 가상 티켓 삭제

#### 캔버스 조작

- 줌 인/아웃 (10% ~ 300%)
- 팬 (드래그로 캔버스 이동)
- "맞춤" 버튼 (모든 요소가 보이도록 자동 조정)
- 격자 배경 표시

#### 카드 드래그

- Jira 카드, 가상 티켓 카드를 캔버스 위에서 자유 배치
- 그룹 내/외 드래그 이동

#### 그룹

- 그룹 생성/이름변경/삭제
- 하위 그룹 (서브그룹) 지원
- 그룹 리사이즈
- 그룹 드래그 이동

#### 관계 연결

- "관계 연결" 모드 진입 → 앵커 포인트 클릭으로 카드 간 관계 설정
- 직교 라우팅 화살표 (S/Z/U-shape)
- 웨이포인트 추가/제거/드래그로 경로 커스텀
- 관계 삭제

### OKR 내보내기

- JSON 형태로 전체 OKR 데이터 내보내기
- Jira 이슈 정보 포함 (summary, status, assignee 등)

## 모듈 구성

| 레이어 | 모듈 | 역할 |
|--------|------|------|
| UI | `OKRPage` | 훅 조합 및 레이아웃 (조합 지점) |
| UI | `KRCanvasModal` | 캔버스 뷰 |
| UI | `LinkModal` | Jira 이슈 연결/가상 티켓 생성 |
| UI | `JiraCard` | Jira 이슈 캔버스 카드 |
| UI | `VirtualCard` | 가상 티켓 캔버스 카드 |
| UI | `GroupContainer` | 재귀적 그룹 컨테이너 |
| UI | `Icons` | 공통 SVG 아이콘 |
| UI Logic | `useOKRActions` | OKR CRUD 및 UI 상태 관리 |
| UI Logic | `useCanvasTransform` | 줌, 팬, fitToView |
| UI Logic | `useCanvasDrag` | 카드/그룹 드래그 |
| UI Logic | `useCanvasRelations` | 관계 연결, 화살표 계산, 앵커 |
| UI Logic | `useTicketActions` | 티켓 연결/해제/생성 |
| UI Logic | `useGroupActions` | 그룹 CRUD |
| UI Logic | `useWaypointDrag` | 웨이포인트 드래그 |
| UI Logic | `useOKR` | React Query 기반 OKR 데이터 조회/저장 |
| Business | `utils/okr` | calcKRProgress, calcObjectiveProgress, buildOKRExportData |
| Business | `utils/anchor-points` | 앵커 포인트 계산, 직교 라우팅 |
| Business | `hooks/okr/okr-canvas.types` | 캔버스 상수 (CARD_W, CARD_H, 줌 범위) |
