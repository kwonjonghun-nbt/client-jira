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

    console.log('Services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
}

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

    const { JiraClient } = await import('./services/jira-client');
    services.jiraClient = new JiraClient(settings.jira.baseUrl, settings.jira.email, token);

    if (services.sync) {
      services.sync.updateSettings(settings);
      services.sync.updateJiraClient(services.jiraClient);
    } else {
      const { SyncService } = await import('./services/sync');
      services.sync = new SyncService(services.storage, services.jiraClient, settings);
    }

    // Restart scheduler
    services.scheduler?.stop();
    const { SchedulerService } = await import('./services/scheduler');
    services.scheduler = new SchedulerService(services.sync, services.mainWindow);
    services.scheduler.start(settings.schedule);

    console.log('[reinit] Jira services re-initialized successfully');
  } catch (error) {
    console.error('[reinit] Failed:', error);
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
  services.terminal?.closeAll();
});
