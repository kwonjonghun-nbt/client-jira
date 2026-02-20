import { ipcMain } from 'electron';
import type { AppServices } from '../services/types';

export function registerJiraHandlers(services: AppServices): void {
  ipcMain.handle('jira:test-connection', async (_event, params: { url: string; email: string; token: string }) => {
    try {
      const { JiraClient } = await import('../services/jira-client');
      const client = new JiraClient(params.url, params.email, params.token);
      return await client.testConnection();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  });

  ipcMain.handle('jira:get-projects', async () => {
    try {
      if (!services.jiraClient) {
        return [];
      }
      return await services.jiraClient.getProjects();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to get projects:', message);
      return [];
    }
  });

  ipcMain.handle('jira:get-issue-changelog', async (_event, issueKey: string) => {
    try {
      if (!services.jiraClient) {
        return [];
      }
      return await services.jiraClient.fetchIssueChangelog(issueKey);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to get issue changelog:', message);
      return [];
    }
  });
}
