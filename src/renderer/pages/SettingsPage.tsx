import { useState, useEffect } from 'react';
import JiraConnectionForm from '../components/settings/JiraConnectionForm';
import ProjectSelector from '../components/settings/ProjectSelector';
import AssigneeInput from '../components/settings/AssigneeInput';
import ScheduleConfig from '../components/settings/ScheduleConfig';
import StorageConfig from '../components/settings/StorageConfig';
import SlackConfig from '../components/settings/SlackConfig';
import DMReminderConfig from '../components/settings/DMReminderConfig';
import EmailConfig from '../components/settings/EmailConfig';
import SettingsListView from '../components/settings/SettingsListView';
import SettingsDetailView from '../components/settings/SettingsDetailView';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { useSettings } from '../hooks/useSettings';
import { useToken } from '../hooks/useToken';
import { useTestConnection } from '../hooks/useSettings';
import { useUpdater } from '../hooks/useUpdater';
import { useUIStore } from '../store/uiStore';
import { DEFAULT_SETTINGS } from '../types/settings.types';
import type { Settings } from '../types/settings.types';
import { useAIConfigStore, CLAUDE_MODELS, GEMINI_MODELS, type AIType, type ClaudeModel, type GeminiModel } from '../store/aiConfigStore';

export default function SettingsPage() {
  const { settings: saved, isLoading, saveSettings, isSaving } = useSettings();
  const tokenManager = useToken();
  const testConnection = useTestConnection();
  const updater = useUpdater();
  const [draft, setDraft] = useState<Settings>(DEFAULT_SETTINGS);
  const [saveMessage, setSaveMessage] = useState('');
  const { aiType, setAIType, claudeModel, setClaudeModel, geminiModel, setGeminiModel } = useAIConfigStore();
  const settingsSection = useUIStore((s) => s.settingsSection);
  const setSettingsSection = useUIStore((s) => s.setSettingsSection);

  useEffect(() => {
    if (saved) setDraft(saved);
  }, [saved]);

  const handleSave = async () => {
    try {
      await tokenManager.saveToken();
      saveSettings(draft);
      setSaveMessage('설정이 저장되었습니다');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch {
      setSaveMessage('저장에 실패했습니다');
    }
  };

  const handleTest = async () => {
    const actualToken = await tokenManager.getActualToken();
    return { url: draft.jira.baseUrl, email: draft.jira.email, token: actualToken };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  if (!settingsSection) {
    return <SettingsListView onSelect={setSettingsSection} />;
  }

  const saveButton = (
    <div className="flex items-center gap-4 pt-4 border-t">
      <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
        저장
      </Button>
      {saveMessage && <span className="text-sm text-green-600">{saveMessage}</span>}
    </div>
  );

  return (
    <SettingsDetailView section={settingsSection} onBack={() => setSettingsSection(null)}>
      {settingsSection === 'jira' && (
        <section className="space-y-4">
          <JiraConnectionForm
            baseUrl={draft.jira.baseUrl}
            email={draft.jira.email}
            token={tokenManager.token}
            hasStoredToken={tokenManager.hasStoredToken}
            onChangeBaseUrl={(v) => setDraft({ ...draft, jira: { ...draft.jira, baseUrl: v } })}
            onChangeEmail={(v) => setDraft({ ...draft, jira: { ...draft.jira, email: v } })}
            onChangeToken={tokenManager.setToken}
            onTest={handleTest}
            testConnection={testConnection}
          />
        </section>
      )}

      {settingsSection === 'collection' && (
        <section className="space-y-4">
          <ProjectSelector
            selectedProjects={draft.collection.projects}
            onChange={(projects) =>
              setDraft({ ...draft, collection: { ...draft.collection, projects } })
            }
            onFetchProjects={() => window.electronAPI.jira.getProjects()}
          />
          <AssigneeInput
            assignees={draft.collection.assignees}
            onChange={(assignees) =>
              setDraft({ ...draft, collection: { ...draft.collection, assignees } })
            }
          />
        </section>
      )}

      {settingsSection === 'schedule' && (
        <section className="space-y-4">
          <ScheduleConfig
            enabled={draft.schedule.enabled}
            times={draft.schedule.times}
            onToggle={(enabled) =>
              setDraft({ ...draft, schedule: { ...draft.schedule, enabled } })
            }
            onChangeTimes={(times) =>
              setDraft({ ...draft, schedule: { ...draft.schedule, times } })
            }
          />
        </section>
      )}

      {settingsSection === 'storage' && (
        <section className="space-y-4">
          <StorageConfig
            retentionDays={draft.storage.retentionDays}
            onChangeRetention={(retentionDays) =>
              setDraft({ ...draft, storage: { ...draft.storage, retentionDays } })
            }
          />
        </section>
      )}

      {settingsSection === 'slack' && (
        <section className="space-y-4">
          <SlackConfig
            enabled={draft.slack.enabled}
            webhookUrl={draft.slack.webhookUrl}
            dailyReportTime={draft.slack.dailyReportTime}
            replyToThread={draft.slack.replyToThread}
            botToken={draft.slack.botToken}
            channelId={draft.slack.channelId}
            threadSearchText={draft.slack.threadSearchText}
            onToggle={(enabled) =>
              setDraft({ ...draft, slack: { ...draft.slack, enabled } })
            }
            onChangeWebhookUrl={(webhookUrl) =>
              setDraft({ ...draft, slack: { ...draft.slack, webhookUrl } })
            }
            onChangeDailyReportTime={(dailyReportTime) =>
              setDraft({ ...draft, slack: { ...draft.slack, dailyReportTime } })
            }
            onChangeReplyToThread={(replyToThread) =>
              setDraft({ ...draft, slack: { ...draft.slack, replyToThread } })
            }
            onChangeBotToken={(botToken) =>
              setDraft({ ...draft, slack: { ...draft.slack, botToken } })
            }
            onChangeChannelId={(channelId) =>
              setDraft({ ...draft, slack: { ...draft.slack, channelId } })
            }
            onChangeThreadSearchText={(threadSearchText) =>
              setDraft({ ...draft, slack: { ...draft.slack, threadSearchText } })
            }
          />
          {draft.slack.enabled && (
            <DMReminderConfig
              dmReminder={draft.slack.dmReminder}
              botToken={draft.slack.botToken}
              assignees={draft.collection.assignees}
              onChange={(dmReminder) =>
                setDraft({ ...draft, slack: { ...draft.slack, dmReminder } })
              }
            />
          )}
        </section>
      )}

      {settingsSection === 'email' && (
        <section className="space-y-4">
          <EmailConfig
            email={draft.email}
            onChange={(email) => setDraft({ ...draft, email })}
          />
        </section>
      )}

      {settingsSection === 'ai' && (
        <section className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">AI 기능에 사용할 CLI 에이전트를 선택합니다.</p>
            <div className="flex gap-2">
              {(['claude', 'gemini'] as AIType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAIType(type)}
                  className={`px-4 py-2 text-sm rounded-lg border cursor-pointer transition-colors ${
                    aiType === type
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {type === 'claude' ? 'Claude' : 'Gemini'}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">모델</label>
              {aiType === 'claude' ? (
                <select
                  value={claudeModel}
                  onChange={(e) => setClaudeModel(e.target.value as ClaudeModel)}
                  className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {CLAUDE_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value as GeminiModel)}
                  className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {GEMINI_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </section>
      )}

      {settingsSection === 'update' && (
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={updater.checkForUpdates}
              isLoading={updater.status === 'checking'}
            >
              업데이트 확인
            </Button>

            {updater.status === 'not-available' && (
              <span className="text-sm text-gray-500">현재 최신 버전입니다.</span>
            )}

            {updater.status === 'available' && (
              <span className="text-sm text-blue-600">
                새 버전 발견, 다운로드 중...
              </span>
            )}

            {updater.status === 'downloaded' && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-green-600">
                  {updater.version ? `v${updater.version} ` : ''}업데이트 준비 완료
                </span>
                <Button variant="primary" onClick={updater.installAndRestart}>
                  재시작
                </Button>
              </div>
            )}

            {updater.status === 'error' && (
              <span className="text-sm text-red-500">
                업데이트 확인 실패: {updater.error || '알 수 없는 오류'}
              </span>
            )}
          </div>
        </section>
      )}

      {settingsSection !== 'update' && saveButton}
    </SettingsDetailView>
  );
}
