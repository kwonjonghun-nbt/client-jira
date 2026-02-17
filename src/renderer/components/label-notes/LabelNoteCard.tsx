import { useCallback, useEffect, useRef, useState } from 'react';

interface LabelNoteCardProps {
  label: string;
  description: string;
  isJiraLabel: boolean;
  onSave: (desc: string) => void;
  onDelete: () => void;
}

export default function LabelNoteCard({
  label,
  description,
  isJiraLabel,
  onSave,
  onDelete,
}: LabelNoteCardProps) {
  const [value, setValue] = useState(description);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 외부에서 description이 바뀌면 동기화
  useEffect(() => {
    setValue(description);
  }, [description]);

  const debouncedSave = useCallback(
    (text: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onSave(text);
      }, 500);
    },
    [onSave],
  );

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);
    debouncedSave(text);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-800">{label}</span>
          {isJiraLabel && (
            <span className="px-1.5 py-0.5 text-[10px] bg-green-50 text-green-600 rounded">
              Jira
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
        >
          삭제
        </button>
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="이 라벨의 의미나 용도를 기록하세요..."
        rows={2}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}
