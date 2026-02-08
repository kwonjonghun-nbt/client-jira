import { useRef, useCallback, useEffect, useState } from 'react';
import { useTerminalStore, type AIType } from '../../store/terminalStore';
import TerminalPanel from './TerminalPanel';

const AI_LABELS: Record<AIType, { name: string; color: string; activeColor: string }> = {
  claude: { name: 'Claude', color: 'bg-purple-100 text-purple-700', activeColor: 'bg-purple-500' },
  gemini: { name: 'Gemini', color: 'bg-blue-100 text-blue-700', activeColor: 'bg-blue-500' },
};

const MIN_WIDTH = 320;
const MAX_WIDTH = 900;
const DEFAULT_WIDTH = 480;

export default function ClaudeTerminalPanel() {
  const isOpen = useTerminalStore((s) => s.isOpen);
  const close = useTerminalStore((s) => s.closeTerminal);
  const aiType = useTerminalStore((s) => s.aiType);
  const setAIType = useTerminalStore((s) => s.setAIType);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
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
      const delta = startX.current - e.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
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
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="flex flex-col border-l border-gray-200 shrink-0 relative"
      style={{ width }}
    >
      {/* 드래그 핸들 */}
      <div
        onMouseDown={onMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors z-10"
      />
      <div className="h-10 flex items-center justify-between px-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-1">
          {(Object.keys(AI_LABELS) as AIType[]).map((type) => {
            const label = AI_LABELS[type];
            const isActive = aiType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => { if (!isActive) setAIType(type); }}
                className={`
                  px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer border-none
                  ${isActive ? `${label.activeColor} text-white` : 'bg-transparent text-gray-500 hover:bg-gray-200'}
                `}
              >
                {label.name}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={close}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200 cursor-pointer bg-transparent border-none"
          title="패널 닫기"
        >
          ×
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <TerminalPanel />
      </div>
    </div>
  );
}
