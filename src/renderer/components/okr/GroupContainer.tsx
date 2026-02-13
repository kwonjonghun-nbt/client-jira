import type { ReactNode } from 'react';
import type { OKRGroup, OKRLink } from '../../types/jira.types';
import type { DragInfo } from '../../hooks/okr/okr-canvas.types';
import { CARD_W, GROUP_HEADER_H } from '../../hooks/okr/okr-canvas.types';

interface GroupContainerProps {
  group: OKRGroup;
  groupLinks: OKRLink[];
  isDragging: boolean;
  zoom: number;
  dragInfo: DragInfo | null;
  editingGroupId: string | null;
  editingGroupTitle: string;
  onMouseDown: (e: React.MouseEvent) => void;
  onResize: (w: number, h: number) => void;
  onStartEdit: () => void;
  onChangeTitle: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  renderCard: (link: OKRLink) => ReactNode;
  startDrag: (e: React.MouseEvent, linkId: string, x: number, y: number) => void;
}

export default function GroupContainer({
  group,
  groupLinks,
  isDragging,
  zoom,
  dragInfo,
  editingGroupId,
  editingGroupTitle,
  onMouseDown,
  onResize,
  onStartEdit,
  onChangeTitle,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  renderCard,
  startDrag,
}: GroupContainerProps) {
  return (
    <div
      data-canvas-item
      style={{
        position: 'absolute',
        left: `${isDragging && dragInfo ? dragInfo.currentX : (group.x ?? 0)}px`,
        top: `${isDragging && dragInfo ? dragInfo.currentY : (group.y ?? 0)}px`,
        width: `${group.w ?? 320}px`,
        minHeight: `${group.h ?? 200}px`,
        zIndex: isDragging ? 50 : 2,
      }}
      className={`border rounded-lg bg-white/80 border-gray-200 ${
        isDragging ? 'shadow-lg ring-2 ring-blue-400' : 'shadow-sm'
      }`}
      onMouseDown={onMouseDown}
    >
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200/80">
        {editingGroupId === group.id ? (
          <input
            type="text"
            value={editingGroupTitle}
            onChange={(e) => onChangeTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            onBlur={onSaveEdit}
            className="flex-1 px-1.5 py-0.5 border border-blue-300 rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <span
            className="flex-1 text-sm font-medium text-gray-700 cursor-pointer"
            onDoubleClick={onStartEdit}
          >
            {group.title}
          </span>
        )}
        <span className="text-xs text-gray-400">{groupLinks.length}</span>
        <button
          type="button"
          onClick={onStartEdit}
          className="p-0.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200 transition-colors"
          title="그룹 이름 수정"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-0.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
          title="그룹 삭제"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Group cards area */}
      <div className="relative" style={{ minHeight: `${(group.h ?? 200) - GROUP_HEADER_H}px` }}>
        {groupLinks.map((link) => (
          <div
            key={link.id}
            data-canvas-item
            style={{
              position: 'absolute',
              left: `${dragInfo?.id === link.id ? dragInfo.currentX : (link.x ?? 0)}px`,
              top: `${dragInfo?.id === link.id ? dragInfo.currentY : (link.y ?? 0)}px`,
              width: `${CARD_W}px`,
              zIndex: dragInfo?.id === link.id ? 50 : 1,
            }}
            className={dragInfo?.id === link.id ? 'cursor-grabbing' : 'cursor-grab'}
            onMouseDown={(e) => {
              e.stopPropagation();
              startDrag(e, link.id, link.x ?? 0, link.y ?? 0);
            }}
          >
            {renderCard(link)}
          </div>
        ))}
        {groupLinks.length === 0 && (
          <p className="text-xs text-gray-400 py-2 px-3 absolute inset-0 flex items-center justify-center">
            아직 카드가 없습니다
          </p>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          const startX = e.clientX;
          const startY = e.clientY;
          const startW = group.w ?? 320;
          const startH = group.h ?? 200;
          const onMove = (me: MouseEvent) => {
            const nw = Math.max(200, startW + (me.clientX - startX) / zoom);
            const nh = Math.max(100, startH + (me.clientY - startY) / zoom);
            onResize(nw, nh);
          };
          const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        }}
      >
        <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="20" cy="20" r="2" />
          <circle cx="20" cy="14" r="2" />
          <circle cx="14" cy="20" r="2" />
        </svg>
      </div>
    </div>
  );
}
