import { useSyncStatus } from '../../hooks/useSyncStatus';
import { useUpdater } from '../../hooks/useUpdater';

export default function StatusBar() {
  const { status, isSyncing } = useSyncStatus();
  const updater = useUpdater();

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
      <div className="flex items-center gap-3">
        <span>{lastSyncText}</span>
        {isSyncing && (
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 border-[1.5px] border-blue-500 border-t-transparent rounded-full animate-spin" />
            동기화 중...
          </span>
        )}
      </div>

      {updater.status === 'available' && (
        <button
          onClick={updater.downloadUpdate}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 cursor-pointer"
        >
          새 버전 v{updater.version} 사용 가능 — 다운로드
        </button>
      )}

      {updater.status === 'downloading' && (
        <span className="flex items-center gap-1 text-blue-600">
          <div className="w-3 h-3 border-[1.5px] border-blue-500 border-t-transparent rounded-full animate-spin" />
          업데이트 다운로드 중... {updater.progress}%
        </span>
      )}

      {updater.status === 'downloaded' && (
        <button
          onClick={updater.installAndRestart}
          className="flex items-center gap-1 text-green-600 hover:text-green-800 cursor-pointer"
        >
          업데이트 준비 완료 — 재시작
        </button>
      )}
    </div>
  );
}
