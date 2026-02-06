import Button from '../common/Button';
import { useSyncStatus } from '../../hooks/useSyncStatus';

export default function SyncButton() {
  const { triggerSync, isSyncing } = useSyncStatus();

  return (
    <Button
      variant="primary"
      size="sm"
      isLoading={!!isSyncing}
      onClick={() => triggerSync()}
    >
      {isSyncing ? '동기화 중...' : '지금 싱크'}
    </Button>
  );
}
