import { useState, useCallback, useEffect, useRef } from 'react';
import { useAITaskStore } from '../../store/aiTaskStore';
import { createTaskId, generateTaskTitle } from '../../utils/ai-tasks';
import { buildCanvasContext, buildCanvasPrompt, parseCanvasResponse, mergeCanvasChanges } from '../../utils/ai-canvas';
import type { UpdateOKR } from './okr-canvas.types';
import type { OKRData, OKRKeyResult, NormalizedIssue } from '../../types/jira.types';

type CanvasAIStatus = 'idle' | 'running' | 'done' | 'error';

export interface UseCanvasAIReturn {
  isOpen: boolean;
  prompt: string;
  status: CanvasAIStatus;
  streamingResult: string;
  error: string | null;
  open: () => void;
  close: () => void;
  setPrompt: (v: string) => void;
  execute: () => void;
  abort: () => void;
}

export function useCanvasAI(
  kr: OKRKeyResult,
  okr: OKRData,
  issueMap: Map<string, NormalizedIssue>,
  updateOKR: UpdateOKR,
): UseCanvasAIReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<CanvasAIStatus>('idle');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const addTask = useAITaskStore((s) => s.addTask);
  const tasks = useAITaskStore((s) => s.tasks);
  const pendingCanvasApply = useAITaskStore((s) => s.pendingCanvasApply);
  const setPendingCanvasApply = useAITaskStore((s) => s.setPendingCanvasApply);

  const krRef = useRef(kr);
  krRef.current = kr;
  const appliedTaskIds = useRef(new Set<string>());

  // Watch task store for completion → auto-apply changes
  useEffect(() => {
    if (!activeTaskId) return;
    const task = tasks.find((t) => t.id === activeTaskId);
    if (!task) return;

    // Already applied
    if (appliedTaskIds.current.has(activeTaskId)) return;

    if (task.status === 'done') {
      appliedTaskIds.current.add(activeTaskId);
      const changes = parseCanvasResponse(task.result);
      if (changes) {
        updateOKR((draft) => mergeCanvasChanges(draft, krRef.current.id, changes));
        setLocalStatus('done');
        setError(null);
      } else {
        setLocalStatus('error');
        setError('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
      }
    }

    if (task.status === 'error') {
      appliedTaskIds.current.add(activeTaskId);
      setLocalStatus('error');
      setError(task.error ?? 'AI 실행 중 오류가 발생했습니다.');
    }
  }, [activeTaskId, tasks, updateOKR]);

  // Apply pending canvas changes (queued from CanvasResultModal)
  useEffect(() => {
    if (!pendingCanvasApply || pendingCanvasApply.krId !== krRef.current.id) return;
    const changes = parseCanvasResponse(pendingCanvasApply.result);
    if (changes) {
      updateOKR((draft) => mergeCanvasChanges(draft, krRef.current.id, changes));
    }
    setPendingCanvasApply(null);
  }, [pendingCanvasApply, updateOKR, setPendingCanvasApply]);

  // Get streaming result from task store
  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;
  const streamingResult = activeTask?.result ?? '';

  const open = useCallback(() => {
    setIsOpen(true);
    setLocalStatus('idle');
    setError(null);
  }, []);

  const close = useCallback(() => {
    // Don't abort — let the task continue in the background
    setIsOpen(false);
    setPrompt('');
    setLocalStatus('idle');
    setError(null);
    setActiveTaskId(null);
  }, []);

  const execute = useCallback(async () => {
    if (!prompt.trim()) return;

    setError(null);
    setLocalStatus('running');

    const context = buildCanvasContext(krRef.current, okr, issueMap);
    const fullPrompt = buildCanvasPrompt(prompt.trim(), context);

    try {
      const jobId = await window.electronAPI.ai.run(fullPrompt);
      const taskId = createTaskId();
      const title = generateTaskTitle('canvas', { krTitle: krRef.current.title });

      addTask({
        id: taskId,
        jobIds: [jobId],
        type: 'canvas',
        title,
        status: 'running',
        result: '',
        error: null,
        createdAt: Date.now(),
        meta: { krId: krRef.current.id },
      });

      setActiveTaskId(taskId);
    } catch (err) {
      setLocalStatus('error');
      setError(err instanceof Error ? err.message : 'AI 실행에 실패했습니다');
    }
  }, [prompt, okr, issueMap, addTask]);

  const abort = useCallback(async () => {
    if (activeTask && activeTask.status === 'running' && activeTask.jobIds[0]) {
      await window.electronAPI.ai.abort(activeTask.jobIds[0]);
    }
    setLocalStatus('idle');
    setActiveTaskId(null);
  }, [activeTask]);

  const status: CanvasAIStatus = localStatus;

  return {
    isOpen,
    prompt,
    status,
    streamingResult,
    error,
    open,
    close,
    setPrompt,
    execute,
    abort,
  };
}
