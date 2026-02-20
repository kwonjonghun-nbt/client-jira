import React from 'react';

interface OKREmptyStateProps {
  onAddObjective: () => void;
}

export default function OKREmptyState({ onAddObjective }: OKREmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <svg
        className="w-16 h-16 text-gray-300 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <p className="text-base mb-4">아직 등록된 목표가 없습니다</p>
      <button
        type="button"
        onClick={onAddObjective}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        첫 번째 목표 추가하기
      </button>
    </div>
  );
}
