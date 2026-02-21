import { useEffect, useState } from 'react';
import type { SyncProgress as SyncProgressType } from '../../types/jira.types';

export default function SyncProgress() {
  const [progress, setProgress] = useState<SyncProgressType | null>(null);

  useEffect(() => {
    const unsubProgress = window.electronAPI.sync.onProgress((data) => {
      setProgress(data);
    });

    const unsubComplete = window.electronAPI.sync.onComplete(() => {
      setTimeout(() => setProgress(null), 1500);
    });

    return () => {
      unsubProgress();
      unsubComplete();
    };
  }, []);

  if (!progress) return null;

  return (
    <div role="status" aria-live="polite" className="fixed bottom-4 right-4 bg-white shadow-lg border border-gray-200 rounded-lg p-4 w-72 z-40">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">데이터 동기화 중...</span>
        <span className="text-xs text-gray-500">{progress.percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      <div className="text-xs text-gray-400 mt-1">
        {progress.current} / {progress.total} 이슈
      </div>
    </div>
  );
}
