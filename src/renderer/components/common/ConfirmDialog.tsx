import { useEffect, useRef } from 'react';
import { useUIStore } from '../../store/uiStore';

export default function ConfirmDialog() {
  const dialog = useUIStore((s) => s.confirmDialog);
  const closeConfirm = useUIStore((s) => s.closeConfirm);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dialog) return;
    confirmBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConfirm();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog, closeConfirm]);

  if (!dialog) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onClick={closeConfirm}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-title" className="text-base font-semibold text-gray-900 mb-2">
          {dialog.title}
        </h3>
        <p className="text-sm text-gray-500 mb-6">{dialog.message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={closeConfirm}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={() => {
              dialog.onConfirm();
              closeConfirm();
            }}
            className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
