import { useState, useEffect, useCallback } from 'react';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloaded' | 'error';

interface UpdaterState {
  status: UpdateStatus;
  version: string | null;
  error: string | null;
}

export function useUpdater() {
  const [state, setState] = useState<UpdaterState>({
    status: 'idle',
    version: null,
    error: null,
  });

  useEffect(() => {
    const cleanups = [
      window.electronAPI.updater.onUpdateAvailable(() => {
        setState((prev) => ({ ...prev, status: 'available' }));
      }),
      window.electronAPI.updater.onUpdateDownloaded((info) => {
        setState({ status: 'downloaded', version: info.version, error: null });
      }),
      window.electronAPI.updater.onUpdateNotAvailable(() => {
        setState((prev) => ({ ...prev, status: 'not-available' }));
      }),
      window.electronAPI.updater.onError((err) => {
        setState((prev) => ({ ...prev, status: 'error', error: err.message }));
      }),
    ];

    return () => cleanups.forEach((fn) => fn());
  }, []);

  const checkForUpdates = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'checking', error: null }));
    window.electronAPI.updater.checkForUpdates();
  }, []);

  const installAndRestart = useCallback(() => {
    window.electronAPI.updater.installAndRestart();
  }, []);

  return { ...state, checkForUpdates, installAndRestart };
}
