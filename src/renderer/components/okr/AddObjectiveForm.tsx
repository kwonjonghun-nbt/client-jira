import React from 'react';

interface AddObjectiveFormProps {
  title: string;
  onTitleChange: (title: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function AddObjectiveForm({ title, onTitleChange, onSubmit, onCancel }: AddObjectiveFormProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-5 mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">새 목표 추가</h3>
      <div className="flex gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="목표 제목을 입력하세요"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
            if (e.key === 'Escape') onCancel();
          }}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!title.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          추가
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  );
}
