import type { OKRLink, NormalizedIssue, AnchorPosition, ConnectionEndpointType } from '../../types/jira.types';
import type { ConnectFrom } from '../../hooks/okr/useCanvasRelations';
import { statusBadgeClass } from '../../utils/issue';
import AnchorDots from './AnchorDots';

interface JiraCardProps {
  link: OKRLink;
  issue: NormalizedIssue | undefined;
  isDragging: boolean;
  connectMode: boolean;
  connectFrom: ConnectFrom | null;
  onAnchorClick: (type: ConnectionEndpointType, id: string, anchor: AnchorPosition) => void;
  onCardClick: () => void;
  onUnlink: () => void;
  setRef: (el: HTMLDivElement | null) => void;
}

export default function JiraCard({
  link,
  issue,
  isDragging,
  connectMode,
  connectFrom,
  onAnchorClick,
  onCardClick,
  onUnlink,
  setRef,
}: JiraCardProps) {
  const isConnectSource = connectFrom?.type === 'link' && connectFrom?.id === link.id;

  return (
    <div
      ref={setRef}
      className={`relative group/card border border-gray-200 rounded-lg p-3 bg-white hover:shadow-sm transition-shadow ${
        connectMode
          ? isConnectSource
            ? 'ring-2 ring-indigo-500 bg-indigo-50'
            : ''
          : ''
      } ${isDragging ? 'shadow-lg ring-2 ring-blue-400 z-50' : ''}`}
      onClick={connectMode ? undefined : onCardClick}
    >
      {/* Anchor dots */}
      <AnchorDots
        elementType="link"
        elementId={link.id}
        visible={connectMode}
        connectFrom={connectFrom}
        onAnchorClick={onAnchorClick}
      />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onUnlink();
        }}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-300 opacity-0 group-hover/card:opacity-100 transition-opacity z-30"
        title="연결 해제"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-mono text-blue-600">{link.issueKey}</span>
        {issue && (
          <span className={`px-1.5 py-0.5 text-xs rounded ${statusBadgeClass(issue.statusCategory)}`}>
            {issue.status}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-700 truncate" title={issue?.summary ?? undefined}>
        {issue?.summary ?? '(이슈 정보 없음)'}
      </p>
      {issue?.assignee && (
        <p className="text-xs text-gray-400 mt-1 truncate">{issue.assignee}</p>
      )}
    </div>
  );
}
