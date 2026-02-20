import { useState } from 'react';
import Button from '../common/Button';
import type { DMReminderSettings } from '../../types/settings.types';

interface DMReminderConfigProps {
  dmReminder: DMReminderSettings;
  botToken: string;
  assignees: string[];
  onChange: (dmReminder: DMReminderSettings) => void;
}

export default function DMReminderConfig({
  dmReminder,
  botToken,
  assignees,
  onChange,
}: DMReminderConfigProps) {
  const [testingDM, setTestingDM] = useState<string | null>(null);
  const [dmTestResult, setDmTestResult] = useState<Record<string, { success: boolean; error?: string }>>({});
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleToggle = (enabled: boolean) => {
    onChange({ ...dmReminder, enabled });
  };

  const handleScheduleChange = (index: number, field: 'time' | 'message', value: string) => {
    const schedules = [...dmReminder.schedules];
    schedules[index] = { ...schedules[index], [field]: value };
    onChange({ ...dmReminder, schedules });
  };

  const handleAddSchedule = () => {
    onChange({
      ...dmReminder,
      schedules: [...dmReminder.schedules, { time: '12:00', message: '' }],
    });
  };

  const handleRemoveSchedule = (index: number) => {
    const schedules = dmReminder.schedules.filter((_, i) => i !== index);
    onChange({ ...dmReminder, schedules });
  };

  const handleMappingChange = (index: number, field: 'slackUserId' | 'enabled', value: string | boolean) => {
    const userMappings = [...dmReminder.userMappings];
    userMappings[index] = { ...userMappings[index], [field]: value };
    onChange({ ...dmReminder, userMappings });
  };

  const handleAddMapping = (assignee: string) => {
    const exists = dmReminder.userMappings.some((m) => m.assignee === assignee);
    if (exists) return;
    onChange({
      ...dmReminder,
      userMappings: [...dmReminder.userMappings, { assignee, slackUserId: '', enabled: true }],
    });
  };

  const handleRemoveMapping = (index: number) => {
    const userMappings = dmReminder.userMappings.filter((_, i) => i !== index);
    onChange({ ...dmReminder, userMappings });
  };

  const handleTestDM = async (userId: string) => {
    if (!botToken || !userId) return;
    setTestingDM(userId);
    setDmTestResult((prev) => ({ ...prev, [userId]: undefined! }));
    try {
      const result = await window.electronAPI.slack.testDM(botToken, userId);
      setDmTestResult((prev) => ({ ...prev, [userId]: result }));
    } catch (error: any) {
      setDmTestResult((prev) => ({ ...prev, [userId]: { success: false, error: error.message } }));
    } finally {
      setTestingDM(null);
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const result = await window.electronAPI.slack.triggerDMReminder();
      setTriggerResult(result);
    } catch (error: any) {
      setTriggerResult({ success: false, error: error.message });
    } finally {
      setTriggering(false);
    }
  };

  // 아직 매핑에 추가되지 않은 담당자 목록
  const unmappedAssignees = assignees.filter(
    (a) => !dmReminder.userMappings.some((m) => m.assignee === a),
  );

  return (
    <div className="border-t pt-4 space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={dmReminder.enabled}
          onChange={(e) => handleToggle(e.target.checked)}
          className="rounded border-gray-300"
        />
        <span className="text-sm font-medium text-gray-700">DM 리마인더 활성화</span>
      </label>
      <p className="text-xs text-gray-400">
        담당자별로 지정된 시간에 슬랙 DM으로 리마인더를 전송합니다.
        Bot Token과 im:write 권한이 필요합니다.
      </p>

      {dmReminder.enabled && (
        <div className="space-y-4 pl-6">
          {/* 스케줄 설정 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">
              리마인더 스케줄 (평일만 발송)
            </label>
            {dmReminder.schedules.map((schedule, index) => (
              <div key={index} className="flex gap-2 items-start">
                <input
                  type="time"
                  value={schedule.time}
                  onChange={(e) => handleScheduleChange(index, 'time', e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
                />
                <input
                  type="text"
                  value={schedule.message}
                  onChange={(e) => handleScheduleChange(index, 'message', e.target.value)}
                  placeholder="리마인더 메시지"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSchedule(index)}
                  className="px-2 py-1.5 text-sm text-red-500 hover:text-red-700 cursor-pointer"
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddSchedule}
              className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              + 스케줄 추가
            </button>
          </div>

          {/* 담당자 매핑 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">
              담당자 ↔ Slack User ID 매핑
            </label>
            <p className="text-xs text-gray-400">
              Slack User ID는 슬랙에서 프로필 → 더보기(⋯) → 멤버 ID 복사로 확인할 수 있습니다.
            </p>

            {dmReminder.userMappings.map((mapping, index) => (
              <div key={mapping.assignee} className="flex gap-2 items-center">
                <label className="flex items-center gap-1.5 cursor-pointer min-w-0">
                  <input
                    type="checkbox"
                    checked={mapping.enabled}
                    onChange={(e) => handleMappingChange(index, 'enabled', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 truncate w-24" title={mapping.assignee}>
                    {mapping.assignee}
                  </span>
                </label>
                <input
                  type="text"
                  value={mapping.slackUserId}
                  onChange={(e) => handleMappingChange(index, 'slackUserId', e.target.value)}
                  placeholder="U0123456789"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTestDM(mapping.slackUserId)}
                  isLoading={testingDM === mapping.slackUserId}
                  disabled={!botToken || !mapping.slackUserId}
                >
                  테스트
                </Button>
                <button
                  type="button"
                  onClick={() => handleRemoveMapping(index)}
                  className="px-2 py-1.5 text-sm text-red-500 hover:text-red-700 cursor-pointer"
                  title="삭제"
                >
                  ✕
                </button>
                {dmTestResult[mapping.slackUserId] && (
                  <span className={`text-xs ${dmTestResult[mapping.slackUserId].success ? 'text-green-600' : 'text-red-500'}`}>
                    {dmTestResult[mapping.slackUserId].success ? '성공' : dmTestResult[mapping.slackUserId].error}
                  </span>
                )}
              </div>
            ))}

            {/* 매핑 안된 담당자 추가 버튼들 */}
            {unmappedAssignees.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {unmappedAssignees.map((assignee) => (
                  <button
                    key={assignee}
                    type="button"
                    onClick={() => handleAddMapping(assignee)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 cursor-pointer"
                  >
                    + {assignee}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 수동 트리거 */}
          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTrigger}
              isLoading={triggering}
              disabled={!botToken || dmReminder.userMappings.filter((m) => m.enabled && m.slackUserId).length === 0}
            >
              지금 DM 리마인더 전송
            </Button>
            {triggerResult && (
              <p className={`text-xs mt-1 ${triggerResult.success ? 'text-green-600' : 'text-red-500'}`}>
                {triggerResult.success ? '리마인더가 전송되었습니다' : `실패: ${triggerResult.error}`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
