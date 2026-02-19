import { useState } from 'react';
import Button from '../common/Button';

interface SlackConfigProps {
  enabled: boolean;
  webhookUrl: string;
  dailyReportTime: string;
  replyToThread: boolean;
  botToken: string;
  channelId: string;
  threadSearchText: string;
  onToggle: (enabled: boolean) => void;
  onChangeWebhookUrl: (url: string) => void;
  onChangeDailyReportTime: (time: string) => void;
  onChangeReplyToThread: (replyToThread: boolean) => void;
  onChangeBotToken: (botToken: string) => void;
  onChangeChannelId: (channelId: string) => void;
  onChangeThreadSearchText: (text: string) => void;
}

export default function SlackConfig({
  enabled,
  webhookUrl,
  dailyReportTime,
  replyToThread,
  botToken,
  channelId,
  threadSearchText,
  onToggle,
  onChangeWebhookUrl,
  onChangeDailyReportTime,
  onChangeReplyToThread,
  onChangeBotToken,
  onChangeChannelId,
  onChangeThreadSearchText,
}: SlackConfigProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [testingBot, setTestingBot] = useState(false);
  const [botTestResult, setBotTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ success: boolean; found?: boolean; text?: string; error?: string } | null>(null);

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

  const handleTestBotToken = async () => {
    if (!botToken || !channelId) return;
    setTestingBot(true);
    setBotTestResult(null);
    try {
      const result = await window.electronAPI.slack.testBotToken(botToken, channelId);
      setBotTestResult(result);
    } catch (error: any) {
      setBotTestResult({ success: false, error: error.message });
    } finally {
      setTestingBot(false);
    }
  };

  const handleSearchMessage = async () => {
    if (!botToken || !channelId || !threadSearchText) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const result = await window.electronAPI.slack.findThreadMessage(botToken, channelId, threadSearchText);
      setSearchResult(result);
    } catch (error: any) {
      setSearchResult({ success: false, error: error.message });
    } finally {
      setSearching(false);
    }
  };

  const canTrigger = webhookUrl || (replyToThread && botToken && channelId && threadSearchText);

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

          {/* 스레드 댓글 모드 */}
          <div className="border-t pt-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={replyToThread}
                onChange={(e) => onChangeReplyToThread(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">스레드 댓글로 전송</span>
            </label>
            <p className="text-xs text-gray-400">
              활성화하면 특정 채널의 메시지를 찾아 스레드 댓글로 리포트를 전송합니다.
              Bot Token이 필요합니다 (channels:history, chat:write 권한).
            </p>

            {replyToThread && (
              <div className="space-y-3 pl-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-600">
                    Bot Token
                  </label>
                  <input
                    type="password"
                    value={botToken}
                    onChange={(e) => onChangeBotToken(e.target.value)}
                    placeholder="xoxb-..."
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-600">
                    Channel ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={channelId}
                      onChange={(e) => onChangeChannelId(e.target.value)}
                      placeholder="C0123456789"
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleTestBotToken}
                      isLoading={testingBot}
                      disabled={!botToken || !channelId}
                    >
                      연결 테스트
                    </Button>
                  </div>
                  {botTestResult && (
                    <p className={`text-xs ${botTestResult.success ? 'text-green-600' : 'text-red-500'}`}>
                      {botTestResult.success ? '채널 연결 성공' : `실패: ${botTestResult.error}`}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    슬랙 채널 이름 우클릭 → 채널 세부정보 보기 → 하단의 채널 ID를 복사하세요
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-600">
                    검색 텍스트
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={threadSearchText}
                      onChange={(e) => onChangeThreadSearchText(e.target.value)}
                      placeholder="데일리 스탠드업"
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSearchMessage}
                      isLoading={searching}
                      disabled={!botToken || !channelId || !threadSearchText}
                    >
                      미리보기
                    </Button>
                  </div>
                  {searchResult && (
                    <p className={`text-xs ${searchResult.success && searchResult.found ? 'text-green-600' : searchResult.success ? 'text-yellow-600' : 'text-red-500'}`}>
                      {searchResult.success && searchResult.found
                        ? `메시지 발견: "${searchResult.text?.slice(0, 80)}${(searchResult.text?.length ?? 0) > 80 ? '...' : ''}"`
                        : searchResult.success
                          ? '오늘 해당 텍스트를 포함한 메시지가 없습니다'
                          : `실패: ${searchResult.error}`}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    오늘 날짜의 메시지 중 이 텍스트를 포함한 메시지를 찾아 스레드에 댓글을 답니다
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTriggerReport}
              isLoading={triggering}
              disabled={!canTrigger}
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
