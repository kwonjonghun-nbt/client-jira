import { ipcMain } from 'electron';
import type { AppServices } from '../services/types';

export function registerEmailHandlers(services: AppServices): void {
  ipcMain.handle('email:start-auth', async (_event, clientId: string, clientSecret: string) => {
    if (!services.email) throw new Error('Email service not available');
    return services.email.startAuth(clientId, clientSecret);
  });

  ipcMain.handle('email:get-auth-status', async (_event, clientId: string, clientSecret: string) => {
    if (!services.email) throw new Error('Email service not available');
    return services.email.getAuthStatus(clientId, clientSecret);
  });

  ipcMain.handle('email:disconnect', async () => {
    if (!services.email) throw new Error('Email service not available');
    await services.email.disconnect();
    return { success: true };
  });

  ipcMain.handle(
    'email:send-report',
    async (
      _event,
      params: {
        to: string[];
        reportFilename: string;
        assignee: string;
        startDate: string;
        endDate: string;
      },
    ) => {
      if (!services.email) throw new Error('Email service not available');
      if (!services.storage) throw new Error('Storage service not available');
      return services.email.sendReportEmail(services.storage, params);
    },
  );
}
