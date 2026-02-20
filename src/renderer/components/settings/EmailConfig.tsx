import { useState, useEffect, useCallback } from 'react';
import Button from '../common/Button';
import type { EmailSettings } from '../../types/settings.types';

interface EmailConfigProps {
  email: EmailSettings;
  onChange: (email: EmailSettings) => void;
}

export default function EmailConfig({ email, onChange }: EmailConfigProps) {
  const [connecting, setConnecting] = useState(false);
  const [authStatus, setAuthStatus] = useState<{ authenticated: boolean; email?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const checkAuthStatus = useCallback(async () => {
    if (!email.clientId || !email.clientSecret) {
      setAuthStatus(null);
      return;
    }
    setChecking(true);
    try {
      const status = await window.electronAPI.email.getAuthStatus(email.clientId, email.clientSecret);
      setAuthStatus(status);
      if (status.authenticated && status.email && status.email !== email.senderEmail) {
        onChange({ ...email, senderEmail: status.email });
      }
    } catch {
      setAuthStatus(null);
    } finally {
      setChecking(false);
    }
  }, [email.clientId, email.clientSecret]);

  useEffect(() => {
    if (email.enabled && email.clientId && email.clientSecret) {
      checkAuthStatus();
    }
  }, [email.enabled, email.clientId, email.clientSecret]);

  const handleConnect = async () => {
    if (!email.clientId || !email.clientSecret) {
      setError('Client ID와 Client Secret을 먼저 입력해주세요.');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const result = await window.electronAPI.email.startAuth(email.clientId, email.clientSecret);
      if (result.success) {
        setAuthStatus({ authenticated: true, email: result.email });
        if (result.email) {
          onChange({ ...email, senderEmail: result.email });
        }
      } else {
        setError(result.error ?? '인증에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await window.electronAPI.email.disconnect();
      setAuthStatus({ authenticated: false });
      onChange({ ...email, senderEmail: '' });
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={email.enabled}
          onChange={(e) => onChange({ ...email, enabled: e.target.checked })}
          className="rounded border-gray-300"
        />
        <span className="text-sm font-medium text-gray-700">이메일 리포트 전송 활성화</span>
      </label>

      {email.enabled && (
        <div className="space-y-4 pl-6">
          {/* OAuth Client 설정 */}
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Google Cloud Console에서 OAuth 클라이언트 ID를 발급받아 입력하세요. (데스크톱 앱 타입)
            </p>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-600">Client ID</label>
              <input
                type="text"
                value={email.clientId}
                onChange={(e) => onChange({ ...email, clientId: e.target.value })}
                placeholder="xxxx.apps.googleusercontent.com"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-600">Client Secret</label>
              <input
                type="password"
                value={email.clientSecret}
                onChange={(e) => onChange({ ...email, clientSecret: e.target.value })}
                placeholder="GOCSPX-xxxx"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 연결 상태 */}
          <div className="flex items-center gap-3 pt-2">
            {authStatus?.authenticated ? (
              <>
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-md">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>{authStatus.email} 연결됨</span>
                </div>
                <Button variant="secondary" size="sm" onClick={handleDisconnect}>
                  연결 해제
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConnect}
                  isLoading={connecting}
                  disabled={!email.clientId || !email.clientSecret}
                >
                  Google 계정 연결
                </Button>
                {checking && (
                  <span className="text-xs text-gray-400">인증 상태 확인 중...</span>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
