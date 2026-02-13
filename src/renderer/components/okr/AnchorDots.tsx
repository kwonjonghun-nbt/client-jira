import type { AnchorPosition, ConnectionEndpointType } from '../../types/jira.types';
import { ALL_ANCHORS, getAnchorOffset } from '../../utils/anchor-points';
import type { ConnectFrom } from '../../hooks/okr/useCanvasRelations';

interface AnchorDotsProps {
  elementType: ConnectionEndpointType;
  elementId: string;
  visible: boolean;
  connectFrom: ConnectFrom | null;
  onAnchorClick: (type: ConnectionEndpointType, id: string, anchor: AnchorPosition) => void;
}

export default function AnchorDots({
  elementType,
  elementId,
  visible,
  connectFrom,
  onAnchorClick,
}: AnchorDotsProps) {
  const isSource = connectFrom?.type === elementType && connectFrom?.id === elementId;

  return (
    <>
      {ALL_ANCHORS.map((anchor) => {
        const offset = getAnchorOffset(anchor);
        const isActiveAnchor = isSource && connectFrom?.anchor === anchor;

        return (
          <button
            key={anchor}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onAnchorClick(elementType, elementId, anchor);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`absolute z-20 w-3 h-3 rounded-full border-2 transition-all duration-150 -translate-x-1/2 -translate-y-1/2 ${
              isActiveAnchor
                ? 'bg-indigo-500 border-indigo-600 scale-150 ring-2 ring-indigo-300 opacity-100'
                : visible
                  ? 'bg-white border-indigo-400 hover:bg-indigo-100 hover:scale-125 opacity-100'
                  : 'bg-white border-indigo-400 opacity-0 group-hover/card:opacity-100 group-hover/group:opacity-100'
            }`}
            style={{
              left: offset.left,
              top: offset.top,
              pointerEvents: visible || isActiveAnchor ? 'auto' : undefined,
            }}
            title={`${anchor} 앵커`}
          />
        );
      })}
    </>
  );
}
