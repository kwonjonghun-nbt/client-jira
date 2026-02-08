import { contextBridge, ipcRenderer } from 'electron';

const api = {
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
  },
  jira: {
    testConnection: (params: { url: string; email: string; token: string }) =>
      ipcRenderer.invoke('jira:test-connection', params),
    getProjects: () => ipcRenderer.invoke('jira:get-projects'),
  },
  settings: {
    load: () => ipcRenderer.invoke('settings:load'),
    save: (settings: unknown) => ipcRenderer.invoke('settings:save', settings),
    saveToken: (token: string) => ipcRenderer.invoke('settings:save-token', token),
    getToken: () => ipcRenderer.invoke('settings:get-token'),
  },
  storage: {
    getLatest: () => ipcRenderer.invoke('storage:get-latest'),
    getMeta: () => ipcRenderer.invoke('storage:get-meta'),
    getLabelNotes: () => ipcRenderer.invoke('storage:get-label-notes'),
    saveLabelNotes: (notes: unknown) => ipcRenderer.invoke('storage:save-label-notes', notes),
    listReports: () => ipcRenderer.invoke('storage:list-reports'),
    getReport: (filename: string) => ipcRenderer.invoke('storage:get-report', filename),
    saveReport: (filename: string, content: string) => ipcRenderer.invoke('storage:save-report', filename, content),
    getChangelog: () => ipcRenderer.invoke('storage:get-changelog'),
  },
  sync: {
    trigger: () => ipcRenderer.invoke('sync:trigger'),
    getStatus: () => ipcRenderer.invoke('sync:get-status'),
    onProgress: (callback: (progress: { current: number; total: number; percentage: number }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, progress: { current: number; total: number; percentage: number }) =>
        callback(progress);
      ipcRenderer.on('sync:progress', handler);
      return () => {
        ipcRenderer.removeListener('sync:progress', handler);
      };
    },
    onComplete: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('sync:complete', handler);
      return () => {
        ipcRenderer.removeListener('sync:complete', handler);
      };
    },
  },
  terminal: {
    create: (aiType?: string, initialPrompt?: string, cols?: number, rows?: number) =>
      ipcRenderer.invoke('terminal:create', aiType, initialPrompt, cols, rows),
    write: (id: string, data: string) =>
      ipcRenderer.invoke('terminal:write', id, data),
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.invoke('terminal:resize', id, cols, rows),
    close: (id: string) =>
      ipcRenderer.invoke('terminal:close', id),
    onData: (callback: (id: string, data: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, id: string, data: string) =>
        callback(id, data);
      ipcRenderer.on('terminal:data', handler);
      return () => {
        ipcRenderer.removeListener('terminal:data', handler);
      };
    },
    onExit: (callback: (id: string, exitCode: number) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, id: string, exitCode: number) =>
        callback(id, exitCode);
      ipcRenderer.on('terminal:exit', handler);
      return () => {
        ipcRenderer.removeListener('terminal:exit', handler);
      };
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
