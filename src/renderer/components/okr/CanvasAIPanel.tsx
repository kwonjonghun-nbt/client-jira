import { useRef, useEffect } from 'react';
import { XIcon } from '../common/Icons';

interface CanvasAIPanelProps {
  prompt: string;
  status: 'idle' | 'running' | 'done' | 'error';
  streamingResult: string;
  error: string | null;
  onPromptChange: (v: string) => void;
  onExecute: () => void;
  onAbort: () => void;
  onClose: () => void;
}

export default function CanvasAIPanel({
  prompt,
  status,
  streamingResult,
  error,
  onPromptChange,
  onExecute,
  onAbort,
  onClose,
}: CanvasAIPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  // Auto-focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-scroll streaming result
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [streamingResult]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (status !== 'running' && prompt.trim()) {
        onExecute();
      }
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const isRunning = status === 'running';

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
          </svg>
          <span className="text-sm font-semibold text-violet-700">AI 캔버스 관리</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
        >
          <XIcon />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {/* Streaming result (shown while running or after done/error) */}
        {(isRunning || streamingResult) && (
          <div
            ref={streamRef}
            className="mb-3 max-h-32 overflow-y-auto rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600 font-mono whitespace-pre-wrap"
          >
            {streamingResult || (isRunning ? 'AI 응답 대기 중...' : '')}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Success message */}
        {status === 'done' && !error && (
          <div className="mb-3 rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-700">
            캔버스가 성공적으로 업데이트되었습니다.
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="캔버스를 어떻게 수정할까요? (예: 프론트엔드/백엔드로 그룹핑해줘, 관련 티켓 간 의존관계 연결해줘)"
            disabled={isRunning}
            rows={2}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
          />
          <div className="flex flex-col gap-1.5">
            {isRunning ? (
              <button
                type="button"
                onClick={onAbort}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 whitespace-nowrap"
              >
                중단
              </button>
            ) : (
              <button
                type="button"
                onClick={onExecute}
                disabled={!prompt.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                실행
              </button>
            )}
          </div>
        </div>

        {/* Hint */}
        <p className="mt-1.5 text-[11px] text-gray-400">
          Enter로 실행 · Shift+Enter로 줄바꿈 · Esc로 닫기{isRunning ? ' · 패널을 닫아도 백그라운드에서 계속 실행됩니다' : ''}
        </p>
      </div>
    </div>
  );
}
