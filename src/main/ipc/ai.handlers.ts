import { ipcMain } from 'electron';
import type { AppServices } from '../services/types';
import { showTaskNotification } from '../services/notification';

export function registerAIHandlers(services: AppServices): void {
  ipcMain.handle('ai:run', (_event, prompt: string, aiType?: string, model?: string) => {
    if (!services.aiRunner) throw new Error('AI Runner not available');
    const validType = aiType === 'claude' || aiType === 'gemini' ? aiType : 'claude';
    return services.aiRunner.run(prompt, validType, model || undefined);
  });

  ipcMain.handle('ai:abort', (_event, id: string) => {
    services.aiRunner?.abort(id);
  });

  ipcMain.handle(
    'ai:notify-task-completed',
    (_event, params: { title: string; status: 'done' | 'error' }) => {
      showTaskNotification(params);
    },
  );
}
