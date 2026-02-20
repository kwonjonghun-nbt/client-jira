import { create } from 'zustand';

import type { AITask } from '../utils/ai-tasks';
import { resolveJobDone, resolveJobError } from '../utils/ai-tasks';

const MAX_TASKS = 20;

// Q3-19: rAF buffering for chunk appends — reduces Zustand updates from per-chunk to per-frame
const chunkBuffer = new Map<string, string>();
let rafScheduled = false;

function flushChunkBuffer(set: (fn: (state: AITaskState) => Partial<AITaskState>) => void) {
  if (chunkBuffer.size === 0) return;
  const buffered = new Map(chunkBuffer);
  chunkBuffer.clear();
  rafScheduled = false;

  set((state) => ({
    tasks: state.tasks.map((task) => {
      let modified = false;
      let updatedTask = task;

      for (const [jobId, text] of buffered) {
        if (!task.jobIds.includes(jobId)) continue;
        modified = true;

        if (updatedTask.subJobs && updatedTask.subJobs[jobId]) {
          updatedTask = {
            ...updatedTask,
            subJobs: {
              ...updatedTask.subJobs,
              [jobId]: { ...updatedTask.subJobs[jobId], result: updatedTask.subJobs[jobId].result + text },
            },
          };
        } else {
          updatedTask = { ...updatedTask, result: updatedTask.result + text };
        }
      }

      return modified ? updatedTask : task;
    }),
  }));
}

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

  appendChunk: (jobId, text) => {
    chunkBuffer.set(jobId, (chunkBuffer.get(jobId) ?? '') + text);
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(() => flushChunkBuffer(set));
    }
  },

  markJobDone: (jobId) =>
    set((state) => ({
      tasks: state.tasks.map((task) => resolveJobDone(task, jobId)),
    })),

  markJobError: (jobId, message) =>
    set((state) => ({
      tasks: state.tasks.map((task) => resolveJobError(task, jobId, message)),
    })),

  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
  closePanel: () => set({ panelOpen: false }),
  selectTask: (taskId) => set({ selectedTaskId: taskId }),
  setOpenCanvasKRId: (krId) => set({ openCanvasKRId: krId }),
  setPendingCanvasApply: (pending) => set({ pendingCanvasApply: pending }),
}));
