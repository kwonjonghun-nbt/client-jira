import { ipcMain, shell } from 'electron';
import { registerJiraHandlers } from './jira.handlers';
import { registerSettingsHandlers } from './settings.handlers';
import { registerStorageHandlers } from './storage.handlers';
import { registerSyncHandlers } from './sync.handlers';
import { registerTerminalHandlers } from './terminal.handlers';
import { registerAIHandlers } from './ai.handlers';
import { registerUpdaterHandlers } from './updater.handlers';
import { registerSlackHandlers } from './slack.handlers';
import type { AppServices } from '../services/types';

export function registerAllHandlers(services: AppServices): void {
  registerJiraHandlers(services);
  registerSettingsHandlers(services);
  registerStorageHandlers(services);
  registerSyncHandlers(services);
  registerTerminalHandlers(services);
  registerAIHandlers(services);
  registerUpdaterHandlers(services);
  registerSlackHandlers(services);

  ipcMain.handle('shell:open-external', (_event, url: string) => {
    return shell.openExternal(url);
  });
}
