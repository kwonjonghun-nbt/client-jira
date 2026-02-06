import { useSyncStatus } from '../../hooks/useSyncStatus';

export default function StatusBar() {
  const { status, isSyncing } = useSyncStatus();

  const lastSyncText = status?.lastSync
    ? `마지막 싱크: ${new Date(status.lastSync).toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : '아직 싱크한 적 없음';

  return (
    <div className="h-7 bg-gray-100 border-t border-gray-200 px-4 flex items-center justify-between text-xs text-gray-500">
      <span>{lastSyncText}</span>
      {isSyncing && (
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 border-[1.5px] border-blue-500 border-t-transparent rounded-full animate-spin" />
          동기화 중...
        </span>
      )}
    </div>
  );
}
