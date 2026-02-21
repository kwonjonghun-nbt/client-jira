import { useEffect } from 'react';

interface CanvasHelpOverlayProps {
  onClose: () => void;
}

const shortcuts = [
  { keys: '드래그', desc: '카드/그룹 이동' },
  { keys: '스크롤', desc: '줌 인/아웃' },
  { keys: '빈 영역 드래그', desc: '캔버스 패닝' },
  { keys: '작업 연결', desc: 'Jira 이슈 또는 가상 티켓 연결' },
  { keys: '관계 연결', desc: '카드 간 화살표 관계 설정' },
  { keys: '그룹', desc: '카드를 묶는 그룹 생성' },
  { keys: 'AI 캔버스', desc: 'AI가 캔버스 구조를 자동 구성' },
  { keys: '맞춤', desc: '모든 카드가 보이도록 뷰 조정' },
  { keys: 'Esc', desc: '모달 닫기' },
];

export default function CanvasHelpOverlay({ onClose }: CanvasHelpOverlayProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-30 bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">캔버스 사용법</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            ×
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.keys} className="flex items-start gap-3">
              <span className="shrink-0 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium min-w-[80px] text-center">
                {s.keys}
              </span>
              <span className="text-sm text-gray-600">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
