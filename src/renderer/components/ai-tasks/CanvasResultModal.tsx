import { useCallback } from 'react';

import { useAITaskStore } from '../../store/aiTaskStore';
import type { AITask } from '../../utils/ai-tasks';

interface CanvasResultModalProps {
  task: AITask;
  onClose: () => void;
}

export default function CanvasResultModal({ task, onClose }: CanvasResultModalProps) {
  const setOpenCanvasKRId = useAITaskStore((s) => s.setOpenCanvasKRId);
  const setPendingCanvasApply = useAITaskStore((s) => s.setPendingCanvasApply);

  const handleGoToCanvas = useCallback(() => {
    const krId = task.meta?.krId;
    if (krId) {
      // Queue the AI result to be applied when the canvas opens
      if (task.status === 'done' && task.result.trim()) {
        setPendingCanvasApply({ krId, result: task.result });
      }
      setOpenCanvasKRId(krId);
      onClose();
    }
  }, [task, setOpenCanvasKRId, setPendingCanvasApply, onClose]);

  const isError = task.status === 'error';
  const hasKrId = !!task.meta?.krId;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-8 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Status icon */}
        {isError ? (
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        ) : (
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* Title */}
        <p className="text-sm text-gray-800 font-medium">{task.title}</p>

        {/* Message */}
        {isError ? (
          <p className="text-sm text-red-500">오류: {task.error || '알 수 없는 오류'}</p>
        ) : (
          <p className="text-sm text-gray-500">캔버스가 성공적으로 업데이트되었습니다.</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2">
          {!isError && hasKrId && (
            <button
              type="button"
              onClick={handleGoToCanvas}
              className="px-4 py-1.5 text-sm bg-violet-500 text-white rounded-lg hover:bg-violet-600 cursor-pointer"
            >
              캔버스 열기
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
