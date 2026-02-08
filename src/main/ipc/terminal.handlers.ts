import { ipcMain } from 'electron';
import type { AppServices } from '../services/types';

export function registerTerminalHandlers(services: AppServices): void {
  ipcMain.handle('terminal:create', (_event, aiType?: string, initialPrompt?: string, cols?: number, rows?: number) => {
    if (!services.mainWindow || !services.terminal) {
      throw new Error('Terminal service not available');
    }
    return services.terminal.create(services.mainWindow, aiType as 'claude' | 'gemini' | undefined, initialPrompt, cols, rows);
  });

  ipcMain.handle('terminal:write', (_event, id: string, data: string) => {
    services.terminal?.write(id, data);
  });

  ipcMain.handle('terminal:resize', (_event, id: string, cols: number, rows: number) => {
    services.terminal?.resize(id, cols, rows);
  });

  ipcMain.handle('terminal:close', (_event, id: string) => {
    services.terminal?.close(id);
  });
}
