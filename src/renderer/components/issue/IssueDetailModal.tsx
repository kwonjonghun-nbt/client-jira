import { useEffect, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import type { NormalizedIssue } from '../../types/jira.types';

const statusColors: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  indeterminate: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

const priorityColors: Record<string, string> = {
  Highest: 'text-red-600',
  High: 'text-orange-500',
  Medium: 'text-yellow-500',
  Low: 'text-blue-500',
  Lowest: 'text-gray-400',
};

function buildPrompt(issue: NormalizedIssue): string {
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
  if (issue.storyPoints != null) lines.push(`- 스토리포인트: ${issue.storyPoints}`);
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
    '## 요청사항',
    '',
    '### 1. 티켓 설명 보완',
    '현재 설명을 분석하여 아래 템플릿에 맞게 **완성된 설명**을 작성해주세요.',
    '기존 내용이 있으면 최대한 살리되, 빠진 항목을 보완합니다.',
    '',
    '```',
    '## 배경 (Background)',
    '이 작업이 왜 필요한지, 어떤 문제나 요구사항에서 시작되었는지.',
    '',
    '## 작업 목표 (Goal)',
    '이 티켓을 통해 달성하려는 구체적인 목표.',
    '',
    '## 완료 기준 (Acceptance Criteria)',
    '- [ ] 기준 1',
    '- [ ] 기준 2',
    '- [ ] 기준 3',
    '',
    '## 참고 자료 (References)',
    '- 관련 디자인/문서/링크',
    '```',
    '',
    '### 2. 세부 설정 검토',
    '아래 항목의 적절성을 검토하고, 변경이 필요하면 **현재값 → 권장값** 형태로 제안해주세요.',
    '- **우선순위**: 작업의 긴급도/중요도에 맞는지',
    '- **스토리포인트**: 작업 규모 대비 적절한지 (1/2/3/5/8/13)',
    '- **라벨**: 위 라벨 정의에 맞는 라벨이 설정되어 있는지 (복수 가능)',
    '- **컴포넌트**: 관련 컴포넌트가 설정되어 있는지',
    '',
    '### 3. 하위 작업(Subtask) 분해',
    '이 이슈를 효과적으로 진행하기 위한 하위 작업을 제안해주세요.',
    '각 Subtask마다 아래 형식으로 작성:',
    '',
    '```',
    '#### Subtask 1: [제목]',
    '- 예상 SP: N',
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
    '1. **보완된 티켓 설명** — 위 템플릿에 맞춰 바로 Jira에 붙여넣기 할 수 있는 완성본',
    '2. **설정 변경 제안** — 표 형태 (항목 | 현재값 | 권장값 | 사유)',
    '3. **Subtask 목록** — 위 형식에 맞춰 각 Subtask 상세',
    '4. **요약** — 전체 예상 SP 합계, 주의사항',
  );

  return lines.join('\n');
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function IssueDetailModal() {
  const issue = useUIStore((s) => s.selectedIssue);
  const baseUrl = useUIStore((s) => s.issueBaseUrl);
  const close = useUIStore((s) => s.closeIssueDetail);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!issue) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [issue, close]);

  if (!issue) return null;

  const statusColor = statusColors[issue.statusCategory] ?? 'bg-gray-100 text-gray-700';
  const priorityColor = priorityColors[issue.priority ?? ''] ?? 'text-gray-400';
  const issueUrl = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/browse/${issue.key}` : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 min-w-0">
            {issueUrl ? (
              <button
                type="button"
                onClick={() => window.electronAPI.shell.openExternal(issueUrl)}
                className="font-mono text-sm text-blue-600 font-bold hover:underline cursor-pointer bg-transparent border-none p-0 shrink-0"
              >
                {issue.key}
              </button>
            ) : (
              <span className="font-mono text-sm text-blue-600 font-bold shrink-0">{issue.key}</span>
            )}
            <span className="text-xs text-gray-400 shrink-0">{issue.issueType}</span>
          </div>
          <button
            type="button"
            onClick={close}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer bg-transparent border-none text-lg"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{issue.summary}</h2>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-5">
            <div>
              <span className="text-gray-400 text-xs">상태</span>
              <div className="mt-0.5">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                  {issue.status}
                </span>
              </div>
            </div>
            <div>
              <span className="text-gray-400 text-xs">우선순위</span>
              <div className={`mt-0.5 font-medium ${priorityColor}`}>{issue.priority ?? '-'}</div>
            </div>
            <div>
              <span className="text-gray-400 text-xs">담당자</span>
              <div className="mt-0.5 text-gray-700">{issue.assignee ?? <span className="text-gray-300">미배정</span>}</div>
            </div>
            <div>
              <span className="text-gray-400 text-xs">보고자</span>
              <div className="mt-0.5 text-gray-700">{issue.reporter ?? '-'}</div>
            </div>
            <div>
              <span className="text-gray-400 text-xs">생성일</span>
              <div className="mt-0.5 text-gray-700">{formatDate(issue.created)}</div>
            </div>
            <div>
              <span className="text-gray-400 text-xs">마감일</span>
              <div className="mt-0.5 text-gray-700">{formatDate(issue.dueDate)}</div>
            </div>
            <div>
              <span className="text-gray-400 text-xs">스토리포인트</span>
              <div className="mt-0.5 text-gray-700">{issue.storyPoints ?? '-'}</div>
            </div>
            <div>
              <span className="text-gray-400 text-xs">스프린트</span>
              <div className="mt-0.5 text-gray-700">{issue.sprint ?? '-'}</div>
            </div>
            {issue.resolution && (
              <div>
                <span className="text-gray-400 text-xs">해결</span>
                <div className="mt-0.5 text-gray-700">{issue.resolution}</div>
              </div>
            )}
            {issue.parent && (
              <div>
                <span className="text-gray-400 text-xs">상위 이슈</span>
                <div className="mt-0.5 text-gray-700 font-mono text-xs">{issue.parent}</div>
              </div>
            )}
          </div>

          {/* Labels */}
          {issue.labels.length > 0 && (
            <div className="mb-4">
              <span className="text-gray-400 text-xs">라벨</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {issue.labels.map((label) => (
                  <span key={label} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Components */}
          {issue.components.length > 0 && (
            <div className="mb-4">
              <span className="text-gray-400 text-xs">컴포넌트</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {issue.components.map((comp) => (
                  <span key={comp} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {comp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks */}
          {issue.subtasks.length > 0 && (
            <div className="mb-4">
              <span className="text-gray-400 text-xs">하위 이슈</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {issue.subtasks.map((key) => (
                  <span key={key} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                    {key}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {issue.description && (
            <div>
              <span className="text-gray-400 text-xs">설명</span>
              <div className="mt-1 text-sm text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed">
                {issue.description}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(buildPrompt(issue)).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="px-4 py-1.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors cursor-pointer"
          >
            {copied ? '복사됨!' : '프롬프트 복사'}
          </button>
          {issueUrl && (
            <button
              type="button"
              onClick={() => window.electronAPI.shell.openExternal(issueUrl)}
              className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
            >
              Jira에서 열기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
