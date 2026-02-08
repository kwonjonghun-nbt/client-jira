import { useRef } from 'react';
import { useTerminal } from '../../hooks/useTerminal';
import { useTerminalStore } from '../../store/terminalStore';
import '@xterm/xterm/css/xterm.css';

const AI_NAMES = { claude: 'Claude Code', gemini: 'Gemini CLI' } as const;

export default function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const aiType = useTerminalStore((s) => s.aiType);
  useTerminal(containerRef);

  return (
    <div className="h-full flex flex-col bg-[#1e1e2e]">
      <div className="h-9 flex items-center px-3 bg-[#181825] border-b border-[#313244]">
        <div className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2" />
        <span className="text-xs text-[#cdd6f4] font-mono">{AI_NAMES[aiType]}</span>
      </div>
      <div ref={containerRef} className="flex-1 p-1 overflow-hidden" />
    </div>
  );
}
