import { useState, useEffect, useCallback } from 'react';

const MASKED = '••••••••••••••••';

export function useToken() {
  const [token, setToken] = useState('');
  const [hasStoredToken, setHasStoredToken] = useState(false);

  useEffect(() => {
    window.electronAPI.settings.getToken().then((t) => {
      if (t) {
        setToken(MASKED);
        setHasStoredToken(true);
      }
    });
  }, []);

  const isTokenChanged = token !== '' && !token.startsWith('••');

  const saveToken = useCallback(async () => {
    if (!isTokenChanged) return;
    await window.electronAPI.settings.saveToken(token);
    setHasStoredToken(true);
    setToken(MASKED);
  }, [token, isTokenChanged]);

  const getActualToken = useCallback(async (): Promise<string> => {
    if (isTokenChanged) return token;
    if (hasStoredToken) {
      const stored = await window.electronAPI.settings.getToken();
      if (stored) return stored;
    }
    return '';
  }, [token, isTokenChanged, hasStoredToken]);

  return {
    token,
    hasStoredToken,
    isTokenChanged,
    setToken,
    saveToken,
    getActualToken,
  };
}
