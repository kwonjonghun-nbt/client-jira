import { useState } from 'react';
import SectionPresenter from './SectionPresenter';
import type { useAIRunner } from '../../hooks/useAIRunner';

interface Props {
  ai: ReturnType<typeof useAIRunner>;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}

export default function AIReportModal({ ai, saving, onSave, onClose }: Props) {
  const [showPresenter, setShowPresenter] = useState(false);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && ai.status !== 'running') {
      onClose();
    }
  };

  // Presentation mode after AI done
  if (ai.status === 'done' && ai.result && showPresenter) {
    return (
      <SectionPresenter
        markdown={ai.result}
        onClose={() => setShowPresenter(false)}
        headerActions={
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : '리포트 저장'}
          </button>
        }
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col">
        {/* Running state */}
        {ai.status === 'running' && (
          <div className="flex flex-col items-center py-16 px-6 gap-4">
            <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600 font-medium">AI가 리포트를 생성하고 있습니다</p>
            <p className="text-xs text-gray-400">완료되면 섹션별로 보여드립니다</p>
            <button
              type="button"
              onClick={ai.abort}
              className="mt-2 px-4 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 cursor-pointer"
            >
              중단
            </button>
          </div>
        )}

        {/* Done state — choose how to view */}
        {ai.status === 'done' && ai.result && !showPresenter && (
          <div className="flex flex-col items-center py-16 px-6 gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 font-medium">리포트 생성이 완료되었습니다</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPresenter(true)}
                className="px-4 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 cursor-pointer"
              >
                섹션별로 보기
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? '저장 중...' : '바로 저장'}
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              닫기
            </button>
          </div>
        )}

        {/* Error state */}
        {ai.status === 'error' && (
          <div className="flex flex-col items-center py-16 px-6 gap-3">
            <p className="text-sm text-red-500">오류: {ai.error || '알 수 없는 오류'}</p>
            <p className="text-xs text-gray-400">CLI가 설치되어 있는지 확인해주세요</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-4 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 cursor-pointer"
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
