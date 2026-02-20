import { useState, useCallback } from 'react';
import { clamp } from 'es-toolkit';

export function usePanelResize(defaultWidth: number, minWidth: number, maxWidth: number) {
  const [labelWidth, setLabelWidth] = useState(defaultWidth);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = labelWidth;
    const onMouseMove = (ev: MouseEvent) => {
      setLabelWidth(clamp(startWidth + (ev.clientX - startX), minWidth, maxWidth));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [labelWidth, minWidth, maxWidth]);

  return { labelWidth, handleResizeStart };
}
