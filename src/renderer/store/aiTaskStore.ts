import { create } from 'zustand';

import type { AITask, AITaskStatus } from '../utils/ai-tasks';
import { mergeSubJobResults } from '../utils/ai-tasks';

const MAX_TASKS = 20;

interface PendingCanvasApply {
  krId: string;
  result: string;
}

interface AITaskState {
  tasks: AITask[];
  panelOpen: boolean;
  selectedTaskId: string | null;
  openCanvasKRId: string | null;
  pendingCanvasApply: PendingCanvasApply | null;

  // Task lifecycle
  addTask: (task: AITask) => void;
  removeTask: (taskId: string) => void;
  clearCompleted: () => void;

  // IPC event handlers (called by useAITaskListener)
  appendChunk: (jobId: string, text: string) => void;
  markJobDone: (jobId: string) => void;
  markJobError: (jobId: string, message: string) => void;

  // UI state
  togglePanel: () => void;
  closePanel: () => void;
  selectTask: (taskId: string | null) => void;
  setOpenCanvasKRId: (krId: string | null) => void;
  setPendingCanvasApply: (pending: PendingCanvasApply | null) => void;
}

export const useAITaskStore = create<AITaskState>((set) => ({
  tasks: [],
  panelOpen: false,
  selectedTaskId: null,
  openCanvasKRId: null,
  pendingCanvasApply: null,

  addTask: (task) =>
    set((state) => {
      const next = [task, ...state.tasks];
      // Auto-remove oldest completed tasks if over limit
      if (next.length > MAX_TASKS) {
        const completed = next.filter((t) => t.status !== 'running');
        if (completed.length > 0) {
          const oldest = completed[completed.length - 1];
          return { tasks: next.filter((t) => t.id !== oldest.id) };
        }
      }
      return { tasks: next };
    }),

  removeTask: (taskId) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) })),

  clearCompleted: () =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.status === 'running') })),

  appendChunk: (jobId, text) =>
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (!task.jobIds.includes(jobId)) return task;
        // Multi-job: append to subJob
        if (task.subJobs && task.subJobs[jobId]) {
          return {
            ...task,
            subJobs: {
              ...task.subJobs,
              [jobId]: { ...task.subJobs[jobId], result: task.subJobs[jobId].result + text },
            },
          };
        }
        // Single-job: append to result
        return { ...task, result: task.result + text };
      }),
    })),

  markJobDone: (jobId) =>
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (!task.jobIds.includes(jobId)) return task;

        // Multi-job task
        if (task.subJobs && task.subJobs[jobId]) {
          const updatedSubJobs = {
            ...task.subJobs,
            [jobId]: { ...task.subJobs[jobId], status: 'done' as AITaskStatus },
          };
          const allDone = Object.values(updatedSubJobs).every(
            (j) => j.status === 'done' || j.status === 'error',
          );
          if (allDone) {
            return {
              ...task,
              subJobs: updatedSubJobs,
              status: 'done' as AITaskStatus,
              result: mergeSubJobResults(updatedSubJobs),
            };
          }
          return { ...task, subJobs: updatedSubJobs };
        }

        // Single-job task
        return { ...task, status: 'done' as AITaskStatus };
      }),
    })),

  markJobError: (jobId, message) =>
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (!task.jobIds.includes(jobId)) return task;

        // Multi-job task
        if (task.subJobs && task.subJobs[jobId]) {
          const updatedSubJobs = {
            ...task.subJobs,
            [jobId]: { ...task.subJobs[jobId], status: 'error' as AITaskStatus },
          };
          const allDone = Object.values(updatedSubJobs).every(
            (j) => j.status === 'done' || j.status === 'error',
          );
          if (allDone) {
            const finalStatus: 'done' | 'error' = Object.values(updatedSubJobs).some(
              (j) => j.status === 'done',
            )
              ? 'done'
              : 'error';
            return {
              ...task,
              subJobs: updatedSubJobs,
              status: finalStatus,
              result: mergeSubJobResults(updatedSubJobs),
              error: message,
            };
          }
          return { ...task, subJobs: updatedSubJobs };
        }

        // Single-job task
        return { ...task, status: 'error' as AITaskStatus, error: message };
      }),
    })),

  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
  closePanel: () => set({ panelOpen: false }),
  selectTask: (taskId) => set({ selectedTaskId: taskId }),
  setOpenCanvasKRId: (krId) => set({ openCanvasKRId: krId }),
  setPendingCanvasApply: (pending) => set({ pendingCanvasApply: pending }),
}));
