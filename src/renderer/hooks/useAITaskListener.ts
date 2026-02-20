import { useEffect, useRef } from 'react';

import { useAITaskStore } from '../store/aiTaskStore';

export function useAITaskListener(): void {
  const appendChunk = useAITaskStore((s) => s.appendChunk);
  const markJobDone = useAITaskStore((s) => s.markJobDone);
  const markJobError = useAITaskStore((s) => s.markJobError);
  const tasks = useAITaskStore((s) => s.tasks);

  // IPC 리스너
  useEffect(() => {
    const cleanups = [
      window.electronAPI.ai.onChunk((id: string, text: string) => appendChunk(id, text)),
      window.electronAPI.ai.onDone((id: string) => markJobDone(id)),
      window.electronAPI.ai.onError((id: string, msg: string) => markJobError(id, msg)),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, [appendChunk, markJobDone, markJobError]);

  // 알림 사이드이펙트 (aiTaskStore에서 이동)
  const notifiedRef = useRef(new Set<string>());

  useEffect(() => {
    for (const task of tasks) {
      if (notifiedRef.current.has(task.id)) continue;
      if (task.status !== 'done' && task.status !== 'error') continue;
      notifiedRef.current.add(task.id);
      window.electronAPI.ai.notifyTaskCompleted({
        title: task.title,
        status: task.status === 'done' ? 'done' : 'error',
      });
    }
  }, [tasks]);
}
