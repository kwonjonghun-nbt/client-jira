import { useState, useEffect, useCallback, useRef } from 'react';

type AIStatus = 'idle' | 'running' | 'done' | 'error';

interface AIRunnerState {
  status: AIStatus;
  result: string;
  error: string | null;
  jobId: string | null;
}

export function useAIRunner() {
  const [state, setState] = useState<AIRunnerState>({
    status: 'idle',
    result: '',
    error: null,
    jobId: null,
  });

  const jobIdRef = useRef<string | null>(null);

  useEffect(() => {
    const cleanups = [
      window.electronAPI.ai.onChunk((id, text) => {
        if (id === jobIdRef.current) {
          setState((prev) => ({ ...prev, result: prev.result + text }));
        }
      }),
      window.electronAPI.ai.onDone((id) => {
        if (id === jobIdRef.current) {
          setState((prev) => ({ ...prev, status: 'done' }));
        }
      }),
      window.electronAPI.ai.onError((id, message) => {
        if (id === jobIdRef.current) {
          setState((prev) => ({ ...prev, status: 'error', error: message }));
        }
      }),
    ];

    return () => cleanups.forEach((fn) => fn());
  }, []);

  const run = useCallback(async (prompt: string, aiType?: string): Promise<string | undefined> => {
    setState({ status: 'running', result: '', error: null, jobId: null });
    try {
      const id = await window.electronAPI.ai.run(prompt, aiType);
      jobIdRef.current = id;
      setState((prev) => ({ ...prev, jobId: id }));
      return id;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'AI 실행에 실패했습니다',
      }));
    }
  }, []);

  const abort = useCallback(async () => {
    if (jobIdRef.current) {
      await window.electronAPI.ai.abort(jobIdRef.current);
      setState((prev) => ({ ...prev, status: 'idle' }));
      jobIdRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    jobIdRef.current = null;
    setState({ status: 'idle', result: '', error: null, jobId: null });
  }, []);

  return { ...state, run, abort, reset };
}
