import { useEffect } from 'react';

import { useAITaskStore } from '../store/aiTaskStore';

export function useAITaskListener(): void {
  const appendChunk = useAITaskStore((s) => s.appendChunk);
  const markJobDone = useAITaskStore((s) => s.markJobDone);
  const markJobError = useAITaskStore((s) => s.markJobError);

  useEffect(() => {
    const cleanups = [
      window.electronAPI.ai.onChunk((id: string, text: string) => appendChunk(id, text)),
      window.electronAPI.ai.onDone((id: string) => markJobDone(id)),
      window.electronAPI.ai.onError((id: string, msg: string) => markJobError(id, msg)),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, [appendChunk, markJobDone, markJobError]);
}
