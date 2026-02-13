import { useState, useEffect } from 'react';
import JiraConnectionForm from '../components/settings/JiraConnectionForm';
import ProjectSelector from '../components/settings/ProjectSelector';
import AssigneeInput from '../components/settings/AssigneeInput';
import ScheduleConfig from '../components/settings/ScheduleConfig';
import StorageConfig from '../components/settings/StorageConfig';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { useSettings } from '../hooks/useSettings';
import { useToken } from '../hooks/useToken';
import { useTestConnection } from '../hooks/useSettings';
import { DEFAULT_SETTINGS } from '../types/settings.types';
import type { Settings } from '../types/settings.types';

export default function SettingsPage() {
  const { settings: saved, isLoading, saveSettings, isSaving } = useSettings();
  const tokenManager = useToken();
  const testConnection = useTestConnection();
  const [draft, setDraft] = useState<Settings>(DEFAULT_SETTINGS);
  const [saveMessage, setSaveMessage] = useState('');

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

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-xl font-bold text-gray-900">설정</h1>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-800 border-b pb-2">Jira 연결</h2>
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

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-800 border-b pb-2">수집 대상</h2>
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

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-800 border-b pb-2">스케줄</h2>
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

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-800 border-b pb-2">저장</h2>
        <StorageConfig
          retentionDays={draft.storage.retentionDays}
          onChangeRetention={(retentionDays) =>
            setDraft({ ...draft, storage: { ...draft.storage, retentionDays } })
          }
        />
      </section>

      <div className="flex items-center gap-4 pt-4 border-t">
        <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
          저장
        </Button>
        {saveMessage && <span className="text-sm text-green-600">{saveMessage}</span>}
      </div>
    </div>
  );
}
