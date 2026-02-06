import { registerJiraHandlers } from './jira.handlers';
import { registerSettingsHandlers } from './settings.handlers';
import { registerStorageHandlers } from './storage.handlers';
import { registerSyncHandlers } from './sync.handlers';
import type { AppServices } from '../services/types';

export function registerAllHandlers(services: AppServices): void {
  registerJiraHandlers(services);
  registerSettingsHandlers(services);
  registerStorageHandlers(services);
  registerSyncHandlers(services);
}
