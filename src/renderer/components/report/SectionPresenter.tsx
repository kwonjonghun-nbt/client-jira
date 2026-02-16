import { useState, useMemo, useCallback } from 'react';
import { renderMarkdown } from '../../utils/reports';

interface Props {
  markdown: string;
  onClose: () => void;
  /** Optional actions to show in the header (e.g. save button) */
  headerActions?: React.ReactNode;
}

/** Split markdown into sections by ## headings */
function splitSections(text: string): string[] {
  if (!text) return [];

  const lines = text.split('\n');
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^##\s+/.test(line) && current.length > 0) {
      sections.push(current.join('\n'));
      current = [line];
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) {
    sections.push(current.join('\n'));
  }

  return sections.filter((s) => s.trim());
}

/** Extract heading text from a markdown section for the progress indicator */
function getSectionTitle(md: string): string {
  const match = md.match(/^##\s+(.+)/m);
  return match ? match[1].replace(/\*\*/g, '') : '';
}

export default function SectionPresenter({ markdown, onClose, headerActions }: Props) {
  const sections = useMemo(() => splitSections(markdown), [markdown]);
  const [currentIdx, setCurrentIdx] = useState(0);

  const isFirst = currentIdx === 0;
  const isLast = currentIdx === sections.length - 1;
  const currentTitle = getSectionTitle(sections[currentIdx] ?? '');

  const goNext = useCallback(() => {
    if (!isLast) setCurrentIdx((i) => i + 1);
  }, [isLast]);

  const goPrev = useCallback(() => {
    if (!isFirst) setCurrentIdx((i) => i - 1);
  }, [isFirst]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      goNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [goNext, goPrev, onClose]);

  if (sections.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <style>{`
        @keyframes presentFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .present-section {
          animation: presentFadeIn 0.4s ease-out;
        }
      `}</style>

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full shrink-0">
              {currentIdx + 1} / {sections.length}
            </span>
            {currentTitle && (
              <span className="text-sm text-gray-500 truncate">{currentTitle}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-gray-100">
          <div
            className="h-full bg-purple-500 transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / sections.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-8 py-6">
          <div key={currentIdx} className="present-section max-w-none">
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(sections[currentIdx]) }} />
          </div>
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
          <button
            type="button"
            onClick={goPrev}
            disabled={isFirst}
            className="px-4 py-2 text-sm rounded-lg border cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            ← 이전
          </button>

          <div className="flex gap-1">
            {sections.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIdx(idx)}
                className={`w-2 h-2 rounded-full cursor-pointer transition-colors ${
                  idx === currentIdx ? 'bg-purple-500' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={isLast ? onClose : goNext}
            className={`px-4 py-2 text-sm rounded-lg cursor-pointer transition-colors ${
              isLast
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-purple-500 text-white hover:bg-purple-600'
            }`}
          >
            {isLast ? '완료' : '다음 →'}
          </button>
        </div>
      </div>
    </div>
  );
}
