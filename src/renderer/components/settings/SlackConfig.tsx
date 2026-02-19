import { useState } from 'react';
import Button from '../common/Button';

interface SlackConfigProps {
  enabled: boolean;
  webhookUrl: string;
  dailyReportTime: string;
  onToggle: (enabled: boolean) => void;
  onChangeWebhookUrl: (url: string) => void;
  onChangeDailyReportTime: (time: string) => void;
}

export default function SlackConfig({
  enabled,
  webhookUrl,
  dailyReportTime,
  onToggle,
  onChangeWebhookUrl,
  onChangeDailyReportTime,
}: SlackConfigProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleTestWebhook = async () => {
    if (!webhookUrl) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await window.electronAPI.slack.testWebhook(webhookUrl);
      setTestResult(result);
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleTriggerReport = async () => {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const result = await window.electronAPI.slack.triggerDailyReport();
      setTriggerResult(result);
    } catch (error: any) {
      setTriggerResult({ success: false, error: error.message });
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="rounded border-gray-300"
        />
        <span className="text-sm font-medium text-gray-700">일일 공유 리포트 활성화</span>
      </label>

      {enabled && (
        <div className="space-y-4 pl-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-600">
              Slack Webhook URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => onChangeWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTestWebhook}
                isLoading={testing}
                disabled={!webhookUrl}
              >
                테스트
              </Button>
            </div>
            {testResult && (
              <p className={`text-xs ${testResult.success ? 'text-green-600' : 'text-red-500'}`}>
                {testResult.success ? '테스트 메시지가 전송되었습니다' : `실패: ${testResult.error}`}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-600">
              리포트 전송 시간
            </label>
            <input
              type="time"
              value={dailyReportTime}
              onChange={(e) => onChangeDailyReportTime(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400">
              매일 지정된 시간에 담당자별 리포트가 자동 생성되어 슬랙으로 전송됩니다
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTriggerReport}
              isLoading={triggering}
              disabled={!webhookUrl}
            >
              지금 리포트 생성/전송
            </Button>
            {triggerResult && (
              <p className={`text-xs mt-1 ${triggerResult.success ? 'text-green-600' : 'text-red-500'}`}>
                {triggerResult.success ? '리포트가 생성되어 슬랙으로 전송되었습니다' : `실패: ${triggerResult.error}`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
