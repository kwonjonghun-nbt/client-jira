import { useState, useRef, useCallback, useEffect } from 'react';

interface ResizablePanelOptions {
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  /** 'left' means drag handle is on left side (panel grows leftward) */
  side: 'left' | 'right';
}

export function useResizablePanel({ defaultWidth, minWidth, maxWidth, side }: ResizablePanelOptions) {
  const [width, setWidth] = useState(defaultWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = side === 'left'
        ? startX.current - e.clientX
        : e.clientX - startX.current;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [minWidth, maxWidth, side]);

  return { width, onMouseDown };
}
