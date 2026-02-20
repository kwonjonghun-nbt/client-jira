import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAITaskStore } from '../../store/aiTaskStore';
import SectionPresenter from '../report/SectionPresenter';
import DailySharePresenter from '../daily-share/DailySharePresenter';
import CanvasResultModal from './CanvasResultModal';

export default function AITaskDetailModal() {
  const queryClient = useQueryClient();
  const selectedTaskId = useAITaskStore((s) => s.selectedTaskId);
  const tasks = useAITaskStore((s) => s.tasks);
  const selectTask = useAITaskStore((s) => s.selectTask);
  const [saving, setSaving] = useState(false);

  const task = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null;

  const handleClose = useCallback(() => {
    selectTask(null);
  }, [selectTask]);

  const handleSave = useCallback(async () => {
    if (!task || !task.result.trim()) return;
    setSaving(true);
    try {
      // Generate title based on task type
      const today = new Date().toISOString().slice(0, 10);
      const title =
        task.type === 'report'
          ? task.title.replace('리포트 생성', '').replace(/[()]/g, '').trim() || `AI리포트_${today}`
          : `${task.title.replace(/[()]/g, '').trim() || '일일공유'}_${today}`;
      await window.electronAPI.storage.saveReport(title, task.result);
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      selectTask(null);
    } finally {
      setSaving(false);
    }
  }, [task, queryClient, selectTask]);

  // Only show for non-running tasks with results
  if (!task || task.status === 'running') return null;

  // Error or empty result state
  if (!task.result.trim()) {
    const isError = task.status === 'error';
    return (
      <div
        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-lg p-8 flex flex-col items-center gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`w-12 h-12 ${isError ? 'bg-red-100' : 'bg-yellow-100'} rounded-full flex items-center justify-center`}>
            {isError ? (
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
              </svg>
            )}
          </div>
          <p className="text-sm text-gray-800 font-medium">{task.title}</p>
          <p className={`text-sm ${isError ? 'text-red-500' : 'text-yellow-600'}`}>
            {isError
              ? `오류: ${task.error || '알 수 없는 오류'}`
              : 'AI 응답이 비어있습니다. 프롬프트를 확인하고 다시 시도해주세요.'}
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-2 px-4 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  // Canvas tasks use a dedicated modal (no report save)
  if (task.type === 'canvas') {
    return <CanvasResultModal task={task} onClose={handleClose} />;
  }

  // Done state with result
  const saveButton = (
    <button
      type="button"
      onClick={handleSave}
      disabled={saving}
      className="px-4 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {saving ? '저장 중...' : '리포트 저장'}
    </button>
  );

  // Visual slides presenter for data-based daily-share
  if (task.slides && task.slides.length > 0) {
    return (
      <DailySharePresenter
        slides={task.slides}
        onClose={handleClose}
        headerActions={saveButton}
      />
    );
  }

  // Markdown presenter for AI-generated results and reports
  return (
    <SectionPresenter
      markdown={task.result}
      onClose={handleClose}
      headerActions={saveButton}
    />
  );
}
