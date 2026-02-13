import type { NormalizedIssue } from '../types/jira.types';

export function getDescriptionTemplate(issueType: string): string {
  const type = issueType.toLowerCase();

  if (type === 'bug') {
    return [
      'h2. 현상',
      '어떤 문제가 발생하는지 구체적으로 설명',
      '',
      'h2. 재현 순서',
      '# 첫 번째 단계',
      '# 두 번째 단계',
      '# 세 번째 단계',
      '',
      'h2. 기대 동작',
      '정상적으로 동작해야 하는 모습',
      '',
      'h2. 실제 동작',
      '현재 잘못 동작하는 모습',
      '',
      'h2. 환경',
      '* 브라우저/OS:',
      '* 발생 빈도: 항상 / 간헐적',
      '* 관련 로그/스크린샷:',
      '',
      'h2. 완료 조건 (DoD)',
      '* [ ] 버그 수정 완료',
      '* [ ] 재현 시나리오에서 정상 동작 확인',
      '* [ ] 코드리뷰 완료',
    ].join('\n');
  }

  if (type === 'epic') {
    return [
      'h2. 목표',
      '이 에픽이 달성하려는 비즈니스/기술 목표',
      '',
      'h2. 범위',
      '* 포함: 이 에픽에 포함되는 작업들',
      '* 제외: 명시적으로 이 에픽에서 다루지 않는 것',
      '',
      'h2. 성공 기준',
      '* 측정 가능한 기준 1',
      '* 측정 가능한 기준 2',
      '',
      'h2. 하위 이슈 구성',
      '|| 이슈 타입 || 설명 ||',
      '| Story | 주요 기능 단위 |',
      '| Task | 기술/인프라 작업 |',
      '| Bug | 관련 버그 수정 |',
      '',
      'h2. 참고',
      '관련 기획 문서, PRD 링크 등',
    ].join('\n');
  }

  if (type === 'sub-task' || type === 'subtask' || type === '하위 작업') {
    return [
      'h2. 작업 내용',
      '구체적으로 무엇을 하는지',
      '',
      'h2. 완료 조건',
      '* [ ] 구현 완료',
      '* [ ] 상위 이슈 담당자 확인',
    ].join('\n');
  }

  if (type === 'task' || type === '작업') {
    return [
      'h2. 목적',
      '이 작업이 필요한 이유',
      '',
      'h2. 작업 내용',
      '* 구체적 작업 항목 1',
      '* 구체적 작업 항목 2',
      '* 구체적 작업 항목 3',
      '',
      'h2. 영향 범위',
      '이 작업으로 영향받는 시스템/모듈',
      '',
      'h2. 완료 조건 (DoD)',
      '* [ ] 작업 완료',
      '* [ ] 코드리뷰 완료',
      '* [ ] 동작 확인',
      '',
      'h2. 참고',
      '관련 문서, 기술 레퍼런스 등',
    ].join('\n');
  }

  // Story / Feature / default
  return [
    'h2. 배경',
    '왜 이 기능이 필요한지 간단히 설명',
    '',
    'h2. 요구사항',
    '* 구체적 요구사항 1',
    '* 구체적 요구사항 2',
    '* 구체적 요구사항 3',
    '',
    'h2. 완료 조건 (DoD)',
    '* [ ] 기능 구현 완료',
    '* [ ] 코드리뷰 완료',
    '* [ ] QA 검증 완료',
    '',
    'h2. 참고',
    '관련 문서, 디자인 링크, 스크린샷 등',
  ].join('\n');
}

export function buildPrompt(issue: NormalizedIssue): string {
  const lines = [
    '다음 Jira 이슈를 분석하여, 팀 내 티켓 작성 표준에 맞게 내용을 보완하고 하위 작업을 분해해주세요.',
    '',
    '---',
    '',
    '## 현재 이슈 정보',
    `- 키: ${issue.key}`,
    `- 요약: ${issue.summary}`,
    `- 유형: ${issue.issueType}`,
    `- 상태: ${issue.status} (${issue.statusCategory})`,
  ];

  if (issue.priority) lines.push(`- 우선순위: ${issue.priority}`);
  if (issue.assignee) lines.push(`- 담당자: ${issue.assignee}`);
  if (issue.sprint) lines.push(`- 스프린트: ${issue.sprint}`);
  if (issue.labels.length > 0) lines.push(`- 라벨: ${issue.labels.join(', ')}`);
  if (issue.components.length > 0) lines.push(`- 컴포넌트: ${issue.components.join(', ')}`);
  if (issue.parent) lines.push(`- 상위 이슈: ${issue.parent}`);
  if (issue.subtasks.length > 0) lines.push(`- 기존 하위 이슈: ${issue.subtasks.join(', ')}`);
  if (issue.dueDate) lines.push(`- 마감일: ${issue.dueDate}`);

  lines.push('', '### 현재 설명');
  if (issue.description) {
    lines.push('```', issue.description, '```');
  } else {
    lines.push('(설명 없음)');
  }

  lines.push(
    '',
    '---',
    '',
    '## 라벨 정의',
    '',
    '| 라벨 | 의미 |',
    '|------|------|',
    '| FE-Feature | 새로운 기능/가치 제공. 신규 페이지, 비즈니스 로직, 서비스 연동 |',
    '| FE-Maintenance | 서비스 품질 유지 대응. 문구 수정, 레이아웃 보정, 운영 요청 |',
    '| FE-Refactoring | 개발 생산성 향상. 레거시 삭제, 컴포넌트화, 타입 구체화, 기술 부채 해결 |',
    '| FE-Performance | 체감 속도 개선. 로딩/렌더링 최적화, 번들 감소, 이미지 최적화 |',
    '| FE-Stability | 에러 방지/장애 대응. 테스트, 모니터링, 로그, 보안 패치 |',
    '| FE-DesignSystem | 일관된 디자인 경험. 공통 UI 컴포넌트, 디자인 가이드, 테마 |',
    '| FE-Discovery | 조사/기록 작업. 리서치, PoC, 설계 문서, 회의록, 운영 가이드 |',
    '| FE-Growth | 지표 개선 가설 검증. A/B 테스트, 트래킹, 퍼널 개선 |',
    '',
    '---',
    '',
    '## 이슈 타입별 설명 템플릿',
    '',
    `이 이슈의 유형은 **${issue.issueType}**입니다. 아래 템플릿을 기준으로 설명을 작성해주세요.`,
    '',
    '```',
    getDescriptionTemplate(issue.issueType),
    '```',
    '',
    '---',
    '',
    '## 요청사항',
    '',
    '### 1. 티켓 설명 보완',
    '현재 설명을 분석하여 위 템플릿에 맞게 **완성된 설명**을 Jira Wiki 마크업으로 작성해주세요.',
    '기존 내용이 있으면 최대한 살리되, 빠진 항목을 보완합니다.',
    '',
    '### 2. 세부 설정 검토',
    '아래 항목의 적절성을 검토하고, 변경이 필요하면 **현재값 → 권장값** 형태로 제안해주세요.',
    '- **우선순위**: 작업의 긴급도/중요도에 맞는지',
    '- **라벨**: 위 라벨 정의에 맞는 라벨이 설정되어 있는지 (복수 가능)',
    '- **컴포넌트**: 관련 컴포넌트가 설정되어 있는지',
    '- **마감일**: 설정되어 있는지, 적절한지',
    '',
    '### 3. 하위 작업(Subtask) 분해',
    '이 이슈를 효과적으로 진행하기 위한 하위 작업을 제안해주세요.',
    '각 Subtask마다 아래 형식으로 작성:',
    '',
    '```',
    '#### Subtask 1: [제목]',
    '- 라벨: FE-XXX',
    '- 설명: 이 Subtask에서 수행할 구체적인 작업 내용',
    '- 완료 기준:',
    '  - [ ] 기준 1',
    '  - [ ] 기준 2',
    '```',
    '',
    '### 4. 출력 형식',
    '아래 순서로 결과를 정리해주세요:',
    '',
    '1. **보완된 티켓 설명** — 위 템플릿에 맞춰 Jira Wiki 마크업으로 바로 붙여넣기 할 수 있는 완성본',
    '2. **설정 변경 제안** — 표 형태 (항목 | 현재값 | 권장값 | 사유)',
    '3. **Subtask 목록** — 위 형식에 맞춰 각 Subtask 상세',
    '4. **요약** — 주의사항',
  );

  return lines.join('\n');
}
