import { useState, useMemo, useCallback } from 'react';
import { buildReportPrompt } from '../utils/reports';

export function useReportPrompt(assignee: string, startDate: string, endDate: string) {
  const [copied, setCopied] = useState(false);

  const promptText = useMemo(
    () => buildReportPrompt(assignee, startDate, endDate),
    [assignee, startDate, endDate],
  );

  const handleCopyPrompt = useCallback(async () => {
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [promptText]);

  return {
    promptText,
    copied,
    handleCopyPrompt,
  };
}
