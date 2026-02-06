import { useState, useEffect } from 'react';
import Button from '../common/Button';
import { useSyncStatus } from '../../hooks/useSyncStatus';

export default function SyncButton() {
  const { triggerSync, isSyncing, syncResult } = useSyncStatus();
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  useEffect(() => {
    if (!syncResult) return;
    if (syncResult.success) {
      setMessage({ text: `${syncResult.issueCount}건 동기화 완료`, success: true });
    } else {
      setMessage({ text: syncResult.error || '동기화 실패', success: false });
    }
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [syncResult]);

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="primary"
        size="sm"
        isLoading={!!isSyncing}
        onClick={() => triggerSync()}
      >
        {isSyncing ? '동기화 중...' : '지금 싱크'}
      </Button>
      {message && (
        <span className={`text-sm ${message.success ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </span>
      )}
    </div>
  );
}
