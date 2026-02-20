import { useState, useCallback } from 'react';
import type { TreeNode, OrderOverrides } from '../utils/timeline';
import { saveOrderOverrides } from '../utils/timeline';

export function useTimelineDragSort(
  visibleNodes: TreeNode[],
  tree: TreeNode[],
  setOrderOverrides: React.Dispatch<React.SetStateAction<OrderOverrides>>,
) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const handleDrop = useCallback((targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return;
    const dragNode = visibleNodes.find((n) => n.issue.key === dragKey);
    const targetNode = visibleNodes.find((n) => n.issue.key === targetKey);
    if (!dragNode || !targetNode) return;
    // 같은 부모가 아니면 무시
    if (dragNode.parentKey !== targetNode.parentKey) return;

    const parentKey = dragNode.parentKey;
    // 현재 형제 순서 가져오기
    const siblings = tree
      .filter((n) => n.parentKey === parentKey)
      .map((n) => n.issue.key);

    const fromIdx = siblings.indexOf(dragKey);
    const toIdx = siblings.indexOf(targetKey);
    if (fromIdx === -1 || toIdx === -1) return;

    const newOrder = [...siblings];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, dragKey);

    setOrderOverrides((prev) => {
      const next = new Map(prev);
      next.set(parentKey, newOrder);
      saveOrderOverrides(next);
      return next;
    });
    setDragKey(null);
    setDropTarget(null);
  }, [dragKey, visibleNodes, tree, setOrderOverrides]);

  return { dragKey, setDragKey, dropTarget, setDropTarget, handleDrop };
}
