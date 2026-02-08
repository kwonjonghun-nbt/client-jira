import { ipcMain, shell } from 'electron';
import { registerJiraHandlers } from './jira.handlers';
import { registerSettingsHandlers } from './settings.handlers';
import { registerStorageHandlers } from './storage.handlers';
import { registerSyncHandlers } from './sync.handlers';
import { registerTerminalHandlers } from './terminal.handlers';
import type { AppServices } from '../services/types';

export function registerAllHandlers(services: AppServices): void {
  registerJiraHandlers(services);
  registerSettingsHandlers(services);
  registerStorageHandlers(services);
  registerSyncHandlers(services);
  registerTerminalHandlers(services);

  ipcMain.handle('shell:open-external', (_event, url: string) => {
    return shell.openExternal(url);
  });
}
