import { useState, useEffect, useCallback, useRef } from 'react';

type MultiAIStatus = 'idle' | 'running' | 'done' | 'error';

interface JobState {
  assignee: string;
  jobId: string;
  result: string;
  status: 'running' | 'done' | 'error';
  error: string | null;
}

interface MultiAIRunnerState {
  status: MultiAIStatus;
  /** Merged markdown result: each assignee's report joined with ## headers */
  result: string;
  error: string | null;
  jobs: JobState[];
}

export function useMultiAIRunner() {
  const [state, setState] = useState<MultiAIRunnerState>({
    status: 'idle',
    result: '',
    error: null,
    jobs: [],
  });

  const jobMapRef = useRef<Map<string, string>>(new Map()); // jobId -> assignee

  useEffect(() => {
    const cleanups = [
      window.electronAPI.ai.onChunk((id, text) => {
        if (!jobMapRef.current.has(id)) return;
        setState((prev) => ({
          ...prev,
          jobs: prev.jobs.map((j) =>
            j.jobId === id ? { ...j, result: j.result + text } : j
          ),
        }));
      }),
      window.electronAPI.ai.onDone((id) => {
        if (!jobMapRef.current.has(id)) return;
        setState((prev) => {
          const updatedJobs = prev.jobs.map((j) =>
            j.jobId === id ? { ...j, status: 'done' as const } : j
          );
          const allDone = updatedJobs.every((j) => j.status === 'done' || j.status === 'error');
          const hasError = updatedJobs.some((j) => j.status === 'error');
          const merged = updatedJobs
            .filter((j) => j.result.trim())
            .map((j) => `## ${j.assignee}\n\n${j.result.trim()}`)
            .join('\n\n---\n\n');
          return {
            ...prev,
            jobs: updatedJobs,
            status: allDone ? (hasError ? 'error' : 'done') : 'running',
            result: allDone ? merged : prev.result,
            error: hasError ? '일부 리포트 생성에 실패했습니다' : null,
          };
        });
      }),
      window.electronAPI.ai.onError((id, message) => {
        if (!jobMapRef.current.has(id)) return;
        setState((prev) => {
          const updatedJobs = prev.jobs.map((j) =>
            j.jobId === id ? { ...j, status: 'error' as const, error: message } : j
          );
          const allDone = updatedJobs.every((j) => j.status === 'done' || j.status === 'error');
          const merged = updatedJobs
            .filter((j) => j.result.trim())
            .map((j) => `## ${j.assignee}\n\n${j.result.trim()}`)
            .join('\n\n---\n\n');
          return {
            ...prev,
            jobs: updatedJobs,
            status: allDone ? 'error' : 'running',
            result: allDone ? merged : prev.result,
            error: message,
          };
        });
      }),
    ];

    return () => cleanups.forEach((fn) => fn());
  }, []);

  /**
   * Run multiple AI jobs in parallel, one per assignee.
   * @param tasks Array of { assignee, prompt } pairs
   * @param aiType 'claude' | 'gemini'
   */
  const runAll = useCallback(async (tasks: { assignee: string; prompt: string }[], aiType?: string, model?: string): Promise<{ assignee: string; jobId: string }[]> => {
    jobMapRef.current.clear();
    const initialJobs: JobState[] = [];

    setState({ status: 'running', result: '', error: null, jobs: [] });

    for (const task of tasks) {
      try {
        const id = await window.electronAPI.ai.run(task.prompt, aiType, model);
        jobMapRef.current.set(id, task.assignee);
        initialJobs.push({
          assignee: task.assignee,
          jobId: id,
          result: '',
          status: 'running',
          error: null,
        });
      } catch (err) {
        initialJobs.push({
          assignee: task.assignee,
          jobId: '',
          result: '',
          status: 'error',
          error: err instanceof Error ? err.message : 'AI 실행 실패',
        });
      }
    }

    setState((prev) => ({ ...prev, jobs: initialJobs }));
    return initialJobs.filter(j => j.jobId).map(j => ({ assignee: j.assignee, jobId: j.jobId }));
  }, []);

  const abort = useCallback(async () => {
    for (const jobId of jobMapRef.current.keys()) {
      await window.electronAPI.ai.abort(jobId);
    }
    jobMapRef.current.clear();
    setState({ status: 'idle', result: '', error: null, jobs: [] });
  }, []);

  const reset = useCallback(() => {
    jobMapRef.current.clear();
    setState({ status: 'idle', result: '', error: null, jobs: [] });
  }, []);

  /** Progress: completed / total */
  const progress = {
    total: state.jobs.length,
    completed: state.jobs.filter((j) => j.status === 'done' || j.status === 'error').length,
  };

  return { ...state, runAll, abort, reset, progress };
}
