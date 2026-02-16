import { ipcMain } from 'electron';
import type { AppServices } from '../services/types';

export function registerAIHandlers(services: AppServices): void {
  ipcMain.handle('ai:run', (_event, prompt: string, aiType?: string) => {
    if (!services.aiRunner) throw new Error('AI Runner not available');
    return services.aiRunner.run(prompt, (aiType as 'claude' | 'gemini') ?? 'claude');
  });

  ipcMain.handle('ai:abort', (_event, id: string) => {
    services.aiRunner?.abort(id);
  });
}
