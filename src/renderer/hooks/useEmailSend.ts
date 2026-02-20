import { useState, useCallback } from 'react';

interface EmailSendState {
  isSending: boolean;
  error: string | null;
  success: boolean;
}

export function useEmailSend() {
  const [state, setState] = useState<EmailSendState>({
    isSending: false,
    error: null,
    success: false,
  });

  const sendReport = useCallback(
    async (params: {
      to: string[];
      reportFilename: string;
      assignee: string;
      startDate: string;
      endDate: string;
    }) => {
      setState({ isSending: true, error: null, success: false });
      try {
        const result = await window.electronAPI.email.sendReport(params);
        if (result.success) {
          setState({ isSending: false, error: null, success: true });
        } else {
          setState({ isSending: false, error: result.error ?? '전송에 실패했습니다.', success: false });
        }
        return result;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        setState({ isSending: false, error: message, success: false });
        return { success: false, error: message };
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ isSending: false, error: null, success: false });
  }, []);

  return {
    isSending: state.isSending,
    error: state.error,
    success: state.success,
    sendReport,
    reset,
  };
}
