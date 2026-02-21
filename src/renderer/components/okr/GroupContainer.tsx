import { memo, type ReactNode } from 'react';
import type { OKRGroup, OKRLink } from '../../types/jira.types';
import type { DragInfo } from '../../hooks/okr/okr-canvas.types';
import { CARD_W, GROUP_HEADER_H, MAX_GROUP_DEPTH } from '../../hooks/okr/okr-canvas.types';
import type { AnchorPosition, ConnectionEndpointType } from '../../types/jira.types';
import type { ConnectFrom } from '../../hooks/okr/useCanvasRelations';
import AnchorDots from './AnchorDots';

interface GroupContainerProps {
  group: OKRGroup;
  groupLinks: OKRLink[];
  childGroups: OKRGroup[];
  allLinks: OKRLink[];
  allGroups: OKRGroup[];
  depth: number;
  isDragging: boolean;
  zoom: number;
  dragInfo: DragInfo | null;
  editingGroupId: string | null;
  editingGroupTitle: string;
  addingSubgroupForId: string | null;
  newGroupTitle: string;
  onMouseDown: (e: React.MouseEvent) => void;
  onResizeGroup: (groupId: string, w: number, h: number) => void;
  onStartEditGroup: (groupId: string, title: string) => void;
  onChangeTitle: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDeleteGroup: (groupId: string) => void;
  onStartAddSubgroup: (groupId: string) => void;
  onNewGroupTitleChange: (v: string) => void;
  onConfirmAddSubgroup: (parentGroupId: string) => void;
  onCancelAddSubgroup: () => void;
  renderCard: (link: OKRLink) => ReactNode;
  connectMode: boolean;
  connectFrom: ConnectFrom | null;
  onAnchorClick: (type: ConnectionEndpointType, id: string, anchor: AnchorPosition) => void;
  setGroupRef: (groupId: string, el: HTMLDivElement | null) => void;
  startDrag: (e: React.MouseEvent, linkId: string, x: number, y: number, parentGroupId?: string) => void;
  startGroupDrag: (e: React.MouseEvent, groupId: string, x: number, y: number, parentGroupId?: string) => void;
}

function GroupContainer({
  group,
  groupLinks,
  childGroups,
  allLinks,
  allGroups,
  depth,
  isDragging,
  zoom,
  dragInfo,
  editingGroupId,
  editingGroupTitle,
  addingSubgroupForId,
  newGroupTitle,
  onMouseDown,
  onResizeGroup,
  onStartEditGroup,
  onChangeTitle,
  onSaveEdit,
  onCancelEdit,
  onDeleteGroup,
  onStartAddSubgroup,
  onNewGroupTitleChange,
  onConfirmAddSubgroup,
  onCancelAddSubgroup,
  renderCard,
  connectMode,
  connectFrom,
  onAnchorClick,
  setGroupRef,
  startDrag,
  startGroupDrag,
}: GroupContainerProps) {
  const canAddSubgroup = depth < MAX_GROUP_DEPTH;

  return (
    <div
      ref={(el) => setGroupRef(group.id, el)}
      data-canvas-item
      className={`group/group border rounded-lg ${
        depth > 1 ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-white/80'
      } ${isDragging ? 'shadow-lg ring-2 ring-blue-400' : 'shadow-sm'} ${
        connectMode && connectFrom?.type === 'group' && connectFrom?.id === group.id
          ? 'ring-2 ring-indigo-500'
          : ''
      }`}
      style={{
        position: 'absolute',
        left: `${isDragging && dragInfo ? dragInfo.currentX : (group.x ?? 0)}px`,
        top: `${isDragging && dragInfo ? dragInfo.currentY : (group.y ?? 0)}px`,
        width: `${group.w ?? 320}px`,
        minHeight: `${group.h ?? 200}px`,
        zIndex: isDragging ? 50 : 2,
      }}
      onMouseDown={onMouseDown}
    >
      {/* Anchor dots for group connections */}
      <AnchorDots
        elementType="group"
        elementId={group.id}
        visible={connectMode}
        connectFrom={connectFrom}
        onAnchorClick={onAnchorClick}
      />

      {/* Group header */}
      <div className={`flex items-center gap-1.5 px-3 py-2 border-b ${
        depth > 1 ? 'border-blue-200/80' : 'border-gray-200/80'
      }`}>
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
            className="flex-1 text-sm font-medium text-gray-700 cursor-pointer truncate"
            onDoubleClick={() => onStartEditGroup(group.id, group.title)}
          >
            {group.title}
          </span>
        )}
        <span className="text-xs text-gray-400">{groupLinks.length}</span>
        {canAddSubgroup && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onStartAddSubgroup(group.id); }}
            className="p-0.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
            title="서브그룹 추가"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => onStartEditGroup(group.id, group.title)}
          className="p-0.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200 transition-colors"
          title="그룹 이름 수정"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onDeleteGroup(group.id)}
          className="p-0.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
          title="그룹 삭제"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Subgroup add form */}
      {addingSubgroupForId === group.id && (
        <div className="flex gap-1.5 items-center px-3 py-2 bg-blue-50/60 border-b border-blue-200/60">
          <input
            type="text"
            value={newGroupTitle}
            onChange={(e) => onNewGroupTitleChange(e.target.value)}
            placeholder="서브그룹 이름"
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') onConfirmAddSubgroup(group.id);
              if (e.key === 'Escape') onCancelAddSubgroup();
            }}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onConfirmAddSubgroup(group.id); }}
            disabled={!newGroupTitle.trim()}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            추가
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCancelAddSubgroup(); }}
            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200"
          >
            취소
          </button>
        </div>
      )}

      {/* Group content area */}
      <div className="relative" style={{ minHeight: `${(group.h ?? 200) - GROUP_HEADER_H}px` }}>
        {/* Cards */}
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
              startDrag(e, link.id, link.x ?? 0, link.y ?? 0, group.id);
            }}
          >
            {renderCard(link)}
          </div>
        ))}

        {/* Child groups (recursive) */}
        {childGroups.map((child) => {
          const childLinks = allLinks.filter((l) => l.groupId === child.id);
          const grandChildren = allGroups.filter((g) => g.parentGroupId === child.id);
          return (
            <GroupContainer
              key={child.id}
              group={child}
              groupLinks={childLinks}
              childGroups={grandChildren}
              allLinks={allLinks}
              allGroups={allGroups}
              depth={depth + 1}
              isDragging={dragInfo?.id === child.id}
              zoom={zoom}
              dragInfo={dragInfo}
              editingGroupId={editingGroupId}
              editingGroupTitle={editingGroupTitle}
              addingSubgroupForId={addingSubgroupForId}
              newGroupTitle={newGroupTitle}
              onMouseDown={(e) => {
                e.stopPropagation();
                startGroupDrag(e, child.id, child.x ?? 0, child.y ?? 0, group.id);
              }}
              onResizeGroup={onResizeGroup}
              onStartEditGroup={onStartEditGroup}
              onChangeTitle={onChangeTitle}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onDeleteGroup={onDeleteGroup}
              onStartAddSubgroup={onStartAddSubgroup}
              onNewGroupTitleChange={onNewGroupTitleChange}
              onConfirmAddSubgroup={onConfirmAddSubgroup}
              onCancelAddSubgroup={onCancelAddSubgroup}
              renderCard={renderCard}
              connectMode={connectMode}
              connectFrom={connectFrom}
              onAnchorClick={onAnchorClick}
              setGroupRef={setGroupRef}
              startDrag={startDrag}
              startGroupDrag={startGroupDrag}
            />
          );
        })}

        {groupLinks.length === 0 && childGroups.length === 0 && (
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
          let rafId = 0;
          const onMove = (me: MouseEvent) => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
              const nw = Math.max(200, startW + (me.clientX - startX) / zoom);
              const nh = Math.max(100, startH + (me.clientY - startY) / zoom);
              onResizeGroup(group.id, nw, nh);
            });
          };
          const onUp = () => {
            cancelAnimationFrame(rafId);
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

export default memo(GroupContainer);
