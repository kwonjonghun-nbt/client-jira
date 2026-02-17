import { useEffect, useRef } from 'react';

import { useAITaskStore } from '../../store/aiTaskStore';
import { formatElapsedTime } from '../../utils/ai-tasks';
import type { AITask } from '../../utils/ai-tasks';

function TaskItem({ task }: { task: AITask }) {
  const selectTask = useAITaskStore((s) => s.selectTask);
  const removeTask = useAITaskStore((s) => s.removeTask);

  const isRunning = task.status === 'running';
  const isDone = task.status === 'done';
  const isError = task.status === 'error';

  // Multi-job progress
  const subJobCount = task.subJobs ? Object.keys(task.subJobs).length : 0;
  const completedSubJobs = task.subJobs
    ? Object.values(task.subJobs).filter((j) => j.status === 'done' || j.status === 'error').length
    : 0;

  const handleClick = () => {
    if (!isRunning) {
      selectTask(task.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`px-4 py-3 border-b border-gray-100 last:border-b-0 ${
        !isRunning ? 'cursor-pointer hover:bg-gray-50' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Status icon */}
        {isRunning && (
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        {isDone && (
          <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {isError && (
          <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}

        {/* Title + info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 truncate">{task.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {isRunning ? formatElapsedTime(task.createdAt) : '완료'}
            {isRunning && subJobCount > 0 && ` · ${completedSubJobs}/${subJobCount} 완료`}
          </p>
        </div>

        {/* Actions */}
        {isRunning && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              /* abort handled via individual hooks */
            }}
            className="text-xs text-red-400 hover:text-red-600 shrink-0"
            title="중단"
          >
            중단
          </button>
        )}
        {!isRunning && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTask(task.id);
            }}
            className="text-xs text-gray-300 hover:text-gray-500 shrink-0"
            title="삭제"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default function AITaskPanel() {
  const panelOpen = useAITaskStore((s) => s.panelOpen);
  const tasks = useAITaskStore((s) => s.tasks);
  const closePanel = useAITaskStore((s) => s.closePanel);
  const clearCompleted = useAITaskStore((s) => s.clearCompleted);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };
    // Use setTimeout to avoid closing immediately from the button click
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [panelOpen, closePanel]);

  if (!panelOpen) return null;

  const hasCompleted = tasks.some((t) => t.status !== 'running');

  return (
    <div
      ref={panelRef}
      className="fixed top-16 right-4 z-50 w-80 bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col max-h-[28rem]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">AI 작업</h3>
        {hasCompleted && (
          <button
            type="button"
            onClick={clearCompleted}
            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            완료 항목 지우기
          </button>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-auto">
        {tasks.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">진행 중인 작업이 없습니다</div>
        ) : (
          tasks.map((task) => <TaskItem key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}
