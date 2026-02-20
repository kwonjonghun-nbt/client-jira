import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { registerAllHandlers } from './ipc';
import type { AppServices } from './services/types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
import started from 'electron-squirrel-startup';
if (started) app.quit();

// Vite environment variable declarations
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Global services container
const services: AppServices = {
  mainWindow: null,
  storage: null,
  credentials: null,
  jiraClient: null,
  sync: null,
  scheduler: null,
  terminal: null,
  aiRunner: null,
  updater: null,
  slack: null,
  dailyReportScheduler: null,
  dmReminderScheduler: null,
  email: null,
};

const createWindow = (): BrowserWindow => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Client Jira',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (process.env.NODE_ENV === 'development' || MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
};

async function initializeCoreServices(): Promise<void> {
  const { StorageService } = await import('./services/storage');
  const { CredentialsService } = await import('./services/credentials');

  services.storage = new StorageService();
  await services.storage.ensureDirectories();

  services.credentials = new CredentialsService();

  try {
    const { TerminalService } = await import('./services/terminal');
    services.terminal = new TerminalService();
  } catch (error) {
    console.warn('Terminal service initialization failed (node-pty not available):', error);
  }
}

async function initializeNetworkServices(): Promise<void> {
  try {
    if (!services.storage || !services.credentials) return;

    const settings = await services.storage.loadSettings();
    if (settings && settings.jira.baseUrl && settings.jira.email) {
      const token = await services.credentials.getToken();
      if (token) {
        const { JiraClient } = await import('./services/jira-client');
        services.jiraClient = new JiraClient(settings.jira.baseUrl, settings.jira.email, token);

        const { SyncService } = await import('./services/sync');
        services.sync = new SyncService(services.storage, services.jiraClient, settings);

        const { SchedulerService } = await import('./services/scheduler');
        services.scheduler = new SchedulerService(services.sync, services.mainWindow);
        services.scheduler.start(settings.schedule);
      }
    }

    // Initialize Email Service (independent of Jira connection)
    const { EmailService } = await import('./services/email');
    services.email = new EmailService(services.credentials);

    // Initialize Slack + Daily Report Scheduler (independent of Jira connection)
    const { SlackService } = await import('./services/slack');
    services.slack = new SlackService();

    const { DailyReportScheduler } = await import('./services/daily-report-scheduler');
    services.dailyReportScheduler = new DailyReportScheduler(
      services.storage,
      services.slack,
      services.mainWindow,
    );
    services.dailyReportScheduler.start(settings.slack);

    const { DMReminderScheduler } = await import('./services/dm-reminder-scheduler');
    services.dmReminderScheduler = new DMReminderScheduler(services.slack);
    services.dmReminderScheduler.start(settings.slack);

    console.log('Services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
}

app.whenReady().then(async () => {
  // Register IPC handlers first
  registerAllHandlers(services);

  // Initialize core services (storage, credentials) BEFORE creating window
  await initializeCoreServices();

  // Create window (renderer can now safely load settings)
  const mainWindow = createWindow();
  services.mainWindow = mainWindow;

  // Initialize AI Runner
  const { AIRunnerService } = await import('./services/ai-runner');
  services.aiRunner = new AIRunnerService(mainWindow);

  // Initialize auto-updater (production only)
  if (!MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const { UpdaterService } = await import('./services/updater');
    services.updater = new UpdaterService(mainWindow);
    services.updater.checkForUpdates();
  }

  // Initialize network-dependent services (Jira, sync, scheduler)
  await initializeNetworkServices();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const win = createWindow();
      services.mainWindow = win;
      services.aiRunner?.updateWindow(win);
      services.scheduler?.updateWindow(win);
      services.dailyReportScheduler?.updateWindow(win);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  services.scheduler?.stop();
  services.dailyReportScheduler?.stop();
  services.dmReminderScheduler?.stop();
  services.aiRunner?.destroyAll();
  services.terminal?.closeAll();
});
