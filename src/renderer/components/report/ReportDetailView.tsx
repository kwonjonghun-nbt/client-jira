import { useState } from 'react';
import Spinner from '../common/Spinner';
import SectionPresenter from './SectionPresenter';
import { renderMarkdown } from '../../utils/reports';

interface Props {
  filename: string;
  content: string | null;
  isLoading: boolean;
  onBack: () => void;
}

export default function ReportDetailView({ filename, content, isLoading, onBack }: Props) {
  const [focusMode, setFocusMode] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
        >
          ← 목록
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">
          {filename.replace(/\.md$/, '')}
        </h1>
        {!isLoading && content && (
          <button
            type="button"
            onClick={() => setFocusMode(true)}
            className="px-3 py-1 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors cursor-pointer"
          >
            집중해서 보기
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div
            className="max-w-4xl"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content ?? '') }}
          />
        )}
      </div>
      {focusMode && content && (
        <SectionPresenter
          markdown={content}
          onClose={() => setFocusMode(false)}
        />
      )}
    </div>
  );
}
