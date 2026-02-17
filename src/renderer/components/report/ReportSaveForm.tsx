import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export default function ReportSaveForm() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveContent, setSaveContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!saveTitle.trim() || !saveContent.trim()) return;
    setSaving(true);
    try {
      await window.electronAPI.storage.saveReport(saveTitle.trim(), saveContent);
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      setSaveTitle('');
      setSaveContent('');
    } finally {
      setSaving(false);
    }
  }, [saveTitle, saveContent, queryClient]);

  return (
    <div className="border-b border-gray-200 px-6 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-green-600 hover:text-green-800 transition-colors cursor-pointer"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        리포트 저장
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <input
            type="text"
            placeholder="리포트 제목 (파일명으로 사용됩니다)"
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
          />
          <textarea
            placeholder="AI가 생성한 리포트 내용을 붙여넣기하세요 (마크다운)"
            value={saveContent}
            onChange={(e) => setSaveContent(e.target.value)}
            rows={12}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-mono resize-y focus:outline-none focus:ring-2 focus:ring-green-300"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!saveTitle.trim() || !saveContent.trim() || saving}
              className="px-4 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <span className="text-xs text-gray-400">
              {saveTitle.trim() && `${saveTitle.trim()}.md 로 저장됩니다`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
