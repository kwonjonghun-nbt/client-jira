import { useState, useMemo, useCallback } from 'react';
import { useCopyToClipboard } from 'usehooks-ts';
import { buildReportPrompt } from '../utils/reports';

export function useReportPrompt(assignee: string, startDate: string, endDate: string) {
  const [, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  const promptText = useMemo(
    () => buildReportPrompt(assignee, startDate, endDate),
    [assignee, startDate, endDate],
  );

  const handleCopyPrompt = useCallback(async () => {
    const ok = await copy(promptText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [promptText, copy]);

  return {
    promptText,
    copied,
    handleCopyPrompt,
  };
}
