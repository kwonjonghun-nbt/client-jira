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
import { useUpdater } from '../hooks/useUpdater';
import { DEFAULT_SETTINGS } from '../types/settings.types';
import type { Settings } from '../types/settings.types';

export default function SettingsPage() {
  const { settings: saved, isLoading, saveSettings, isSaving } = useSettings();
  const tokenManager = useToken();
  const testConnection = useTestConnection();
  const updater = useUpdater();
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

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-800 border-b pb-2">앱 업데이트</h2>
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
            <div className="flex items-center gap-3">
              <span className="text-sm text-blue-600">
                새 버전 v{updater.version} 사용 가능
              </span>
              <Button variant="primary" onClick={updater.downloadUpdate}>
                다운로드
              </Button>
            </div>
          )}

          {updater.status === 'downloading' && (
            <span className="text-sm text-blue-600">
              다운로드 중... {updater.progress}%
            </span>
          )}

          {updater.status === 'downloaded' && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-green-600">업데이트 준비 완료</span>
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

      <div className="flex items-center gap-4 pt-4 border-t">
        <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
          저장
        </Button>
        {saveMessage && <span className="text-sm text-green-600">{saveMessage}</span>}
      </div>
    </div>
  );
}
