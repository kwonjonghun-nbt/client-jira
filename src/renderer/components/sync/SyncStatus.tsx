import { format, parseISO } from 'date-fns';

interface SyncStatusProps {
  syncedAt: string | undefined;
  totalCount: number | undefined;
  projects: string[] | undefined;
}

export default function SyncStatusDisplay({ syncedAt, totalCount, projects }: SyncStatusProps) {
  if (!syncedAt) {
    return (
      <p className="text-sm text-gray-400">아직 데이터가 없습니다. 설정 후 싱크해주세요.</p>
    );
  }

  const time = format(parseISO(syncedAt), 'MM/dd HH:mm');

  return (
    <p className="text-sm text-gray-500">
      마지막 싱크: {time} | 총 {totalCount ?? 0}건
      {projects && projects.length > 0 && ` | ${projects.length}개 프로젝트`}
    </p>
  );
}
