import { useState, useCallback } from 'react';
import { useEmailSend } from '../../hooks/useEmailSend';

interface Props {
  filename: string;
  assignee: string;
  startDate: string;
  endDate: string;
  onClose: () => void;
}

export default function EmailSendModal({
  filename,
  assignee,
  startDate,
  endDate,
  onClose,
}: Props) {
  const [toInput, setToInput] = useState('');
  const { isSending, error, success, sendReport } = useEmailSend();

  const handleSend = useCallback(async () => {
    const recipients = toInput
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    if (recipients.length === 0) return;

    await sendReport({
      to: recipients,
      reportFilename: filename,
      assignee,
      startDate,
      endDate,
    });
  }, [toInput, sendReport, filename, assignee, startDate, endDate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">이메일로 리포트 전송</h2>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              수신자 이메일
            </label>
            <input
              type="text"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              placeholder="email@example.com (쉼표로 다수 입력)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSending || success}
            />
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>리포트: {filename.replace(/\.md$/, '')}</p>
            <p>담당자: {assignee} | 기간: {startDate} ~ {endDate}</p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
              이메일이 성공적으로 전송되었습니다.
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            {success ? '닫기' : '취소'}
          </button>
          {!success && (
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || !toInput.trim()}
              className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSending ? '전송 중...' : '전송'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
