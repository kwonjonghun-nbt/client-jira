import type { AppServices } from './types';

export async function reinitializeJiraServices(services: AppServices): Promise<void> {
  try {
    if (!services.storage || !services.credentials) {
      console.log('[reinit] storage or credentials not ready');
      return;
    }

    const settings = await services.storage.loadSettings();
    if (!settings?.jira.baseUrl || !settings?.jira.email) {
      console.log('[reinit] Jira settings incomplete, skipping');
      return;
    }

    const token = await services.credentials.getToken();
    if (!token) {
      console.log('[reinit] No token available, skipping');
      return;
    }

    const { JiraClient } = await import('./jira-client');
    services.jiraClient = new JiraClient(settings.jira.baseUrl, settings.jira.email, token);

    if (services.sync) {
      services.sync.updateSettings(settings);
      services.sync.updateJiraClient(services.jiraClient);
    } else {
      const { SyncService } = await import('./sync');
      services.sync = new SyncService(services.storage, services.jiraClient, settings);
    }

    // Restart scheduler
    services.scheduler?.stop();
    const { SchedulerService } = await import('./scheduler');
    services.scheduler = new SchedulerService(services.sync, services.mainWindow);
    services.scheduler.start(settings.schedule);

    // Restart daily report scheduler
    services.dailyReportScheduler?.stop();
    if (services.storage && services.slack) {
      const { DailyReportScheduler } = await import('./daily-report-scheduler');
      services.dailyReportScheduler = new DailyReportScheduler(
        services.storage,
        services.slack,
        services.mainWindow,
      );
      services.dailyReportScheduler.start(settings.slack);
    }

    // Restart DM reminder scheduler
    services.dmReminderScheduler?.stop();
    if (services.slack) {
      const { DMReminderScheduler } = await import('./dm-reminder-scheduler');
      services.dmReminderScheduler = new DMReminderScheduler(services.slack);
      services.dmReminderScheduler.start(settings.slack);
    }

    console.log('[reinit] Jira services re-initialized successfully');
  } catch (error) {
    console.error('[reinit] Failed:', error);
  }
}
