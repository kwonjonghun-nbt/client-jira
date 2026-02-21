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

    // Restart team schedulers
    if (services.storage && services.slack) {
      for (const ts of services.teamSchedulers.values()) {
        ts.dailyReport.stop();
        ts.dmReminder.stop();
      }
      services.teamSchedulers.clear();

      const { DailyReportScheduler } = await import('./daily-report-scheduler');
      const { DMReminderScheduler } = await import('./dm-reminder-scheduler');

      for (const team of settings.teams) {
        if (team.slack.enabled) {
          const teamDaily = new DailyReportScheduler(
            services.storage,
            services.slack,
            services.mainWindow,
            undefined,
            team.assignees,
          );
          teamDaily.start(team.slack);

          const teamDM = new DMReminderScheduler(services.slack);
          teamDM.start(team.slack);

          services.teamSchedulers.set(team.id, {
            dailyReport: teamDaily,
            dmReminder: teamDM,
          });
        }
      }
    }

    console.log('[reinit] Jira services re-initialized successfully');
  } catch (error) {
    console.error('[reinit] Failed:', error);
  }
}
