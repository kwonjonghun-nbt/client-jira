import { useTerminalStore, type AIType } from '../../store/terminalStore';
import TerminalPanel from './TerminalPanel';
import { useResizablePanel } from '../../hooks/useResizablePanel';

const AI_LABELS: Record<AIType, { name: string; color: string; activeColor: string }> = {
  claude: { name: 'Claude', color: 'bg-purple-100 text-purple-700', activeColor: 'bg-purple-500' },
  gemini: { name: 'Gemini', color: 'bg-blue-100 text-blue-700', activeColor: 'bg-blue-500' },
};

export default function ClaudeTerminalPanel() {
  const isOpen = useTerminalStore((s) => s.isOpen);
  const close = useTerminalStore((s) => s.closeTerminal);
  const aiType = useTerminalStore((s) => s.aiType);
  const setAIType = useTerminalStore((s) => s.setAIType);

  const { width, onMouseDown } = useResizablePanel({
    defaultWidth: 480,
    minWidth: 320,
    maxWidth: 900,
    side: 'left',
  });

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
