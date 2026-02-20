import { useCallback } from 'react';
import { useAIConfigStore } from '../store/aiConfigStore';

export function useAIExecutor() {
  const aiType = useAIConfigStore((s) => s.aiType);
  const claudeModel = useAIConfigStore((s) => s.claudeModel);
  const geminiModel = useAIConfigStore((s) => s.geminiModel);

  const execute = useCallback(
    async (prompt: string): Promise<string> => {
      const model = aiType === 'claude' ? claudeModel : geminiModel;
      return window.electronAPI.ai.run(prompt, aiType, model);
    },
    [aiType, claudeModel, geminiModel],
  );

  const executeMulti = useCallback(
    async (tasks: { key: string; prompt: string }[]): Promise<{ key: string; jobId: string }[]> => {
      const model = aiType === 'claude' ? claudeModel : geminiModel;
      const results: { key: string; jobId: string }[] = [];

      for (const task of tasks) {
        const jobId = await window.electronAPI.ai.run(task.prompt, aiType, model);
        results.push({ key: task.key, jobId });
      }

      return results;
    },
    [aiType, claudeModel, geminiModel],
  );

  const abort = useCallback(async (jobId: string) => {
    await window.electronAPI.ai.abort(jobId);
  }, []);

  return { execute, executeMulti, abort };
}
