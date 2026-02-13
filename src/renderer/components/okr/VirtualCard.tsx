import type { OKRLink, VirtualTicket, AnchorPosition, ConnectionEndpointType } from '../../types/jira.types';
import type { ConnectFrom } from '../../hooks/okr/useCanvasRelations';
import AnchorDots from './AnchorDots';

const issueTypeLabels: Record<string, string> = {
  task: '작업',
  story: '스토리',
  epic: '에픽',
  bug: '버그',
};

const issueTypeColors: Record<string, string> = {
  epic: 'bg-purple-100 text-purple-700',
  story: 'bg-blue-100 text-blue-700',
  task: 'bg-emerald-100 text-emerald-700',
  bug: 'bg-red-100 text-red-700',
};

interface VirtualCardProps {
  link: OKRLink;
  vt: VirtualTicket;
  isDragging: boolean;
  connectMode: boolean;
  connectFrom: ConnectFrom | null;
  isEditing: boolean;
  editingTitle: string;
  onAnchorClick: (type: ConnectionEndpointType, id: string, anchor: AnchorPosition) => void;
  onCardClick: () => void;
  onUnlink: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onChangeTitle: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  setRef: (el: HTMLDivElement | null) => void;
}

export default function VirtualCard({
  link,
  vt,
  isDragging,
  connectMode,
  connectFrom,
  isEditing,
  editingTitle,
  onAnchorClick,
  onCardClick,
  onUnlink,
  onDelete,
  onStartEdit,
  onChangeTitle,
  onSaveEdit,
  onCancelEdit,
  setRef,
}: VirtualCardProps) {
  const isConnectSource = connectFrom?.type === 'link' && connectFrom?.id === link.id;
  const vtColor = issueTypeColors[vt.issueType] ?? 'bg-gray-100 text-gray-700';

  return (
    <div
      ref={setRef}
      onClick={connectMode ? undefined : onCardClick}
      className={`relative group/card border-2 border-dashed border-gray-300 rounded-lg p-3 bg-gray-50 ${
        connectMode
          ? isConnectSource
            ? 'ring-2 ring-indigo-500 !bg-indigo-50'
            : ''
          : ''
      } ${isDragging ? 'shadow-lg ring-2 ring-blue-400 z-50' : ''}`}
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
        <span className={`px-1.5 py-0.5 text-xs rounded ${vtColor}`}>
          {issueTypeLabels[vt.issueType] ?? vt.issueType}
        </span>
        <span className="text-xs text-gray-400">(가상 티켓)</span>
      </div>
      {isEditing ? (
        <input
          type="text"
          value={editingTitle}
          onChange={(e) => onChangeTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit();
            if (e.key === 'Escape') onCancelEdit();
          }}
          onBlur={onSaveEdit}
          className="w-full px-1.5 py-0.5 border border-blue-300 rounded text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      ) : (
        <p
          className="text-xs text-gray-700 truncate cursor-pointer"
          onDoubleClick={onStartEdit}
        >
          {vt.title}
        </p>
      )}
      {vt.assignee && (
        <p className="text-xs text-gray-400 mt-1 truncate">{vt.assignee}</p>
      )}
      <div className="flex items-center gap-1 mt-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit();
          }}
          className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
          title="수정"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-0.5 text-gray-400 hover:text-red-600 rounded"
          title="삭제"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
