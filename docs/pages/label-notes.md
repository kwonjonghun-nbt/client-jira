# 라벨 메모 페이지

## 개요

Jira 라벨의 의미와 용도를 기록·관리하는 메모 페이지.

## 기능

### 라벨 관리

- 라벨명 입력으로 새 메모 추가
- Jira에서 수집된 라벨 중 메모 미등록 항목 빠른 추가 버튼
- 라벨 삭제

### 메모 편집

- 라벨별 textarea로 설명 작성
- 500ms 디바운스 자동 저장
- Jira 라벨 여부 뱃지 표시

## 모듈 구성

| 레이어 | 모듈 | 역할 |
|--------|------|------|
| UI | `LabelNotesPage` | 훅 조합 및 레이아웃 |
| UI | `LabelNoteCard` | 개별 라벨 메모 카드 (자체 상태 관리) |
| UI Logic | `useLabelNotesPage` | CRUD, Jira 라벨 추출 |
| UI Logic | `useLabelNotes` | React Query 기반 데이터 조회/저장 |
