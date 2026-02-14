import { useState, useEffect, useCallback } from 'react';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

interface UpdaterState {
  status: UpdateStatus;
  version: string | null;
  progress: number;
}

export function useUpdater() {
  const [state, setState] = useState<UpdaterState>({
    status: 'idle',
    version: null,
    progress: 0,
  });

  useEffect(() => {
    const cleanups = [
      window.electronAPI.updater.onUpdateAvailable((info) => {
        setState({ status: 'available', version: info.version, progress: 0 });
      }),
      window.electronAPI.updater.onDownloadProgress((progress) => {
        setState((prev) => ({ ...prev, status: 'downloading', progress: progress.percent }));
      }),
      window.electronAPI.updater.onUpdateDownloaded((info) => {
        setState({ status: 'downloaded', version: info.version, progress: 100 });
      }),
      window.electronAPI.updater.onError(() => {
        setState((prev) => ({ ...prev, status: 'error' }));
      }),
    ];

    return () => cleanups.forEach((fn) => fn());
  }, []);

  const checkForUpdates = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'checking' }));
    window.electronAPI.updater.checkForUpdates();
  }, []);

  const downloadUpdate = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'downloading', progress: 0 }));
    window.electronAPI.updater.downloadUpdate();
  }, []);

  const installAndRestart = useCallback(() => {
    window.electronAPI.updater.installAndRestart();
  }, []);

  return { ...state, checkForUpdates, downloadUpdate, installAndRestart };
}
