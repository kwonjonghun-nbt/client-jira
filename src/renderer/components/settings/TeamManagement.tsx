import { useState } from 'react';
import type { Team, SlackSettings, Settings } from '../../types/settings.types';
import { TEAM_COLORS } from '../../types/settings.types';
import Button from '../common/Button';
import SlackConfig from './SlackConfig';
import DMReminderConfig from './DMReminderConfig';

interface Props {
  teams: Team[];
  allAssignees: string[];
  onChange: (teams: Team[]) => void;
  draft: Settings;
  onDraftChange: (draft: Settings) => void;
}

const DEFAULT_SLACK: SlackSettings = {
  enabled: false,
  webhookUrl: '',
  dailyReportTime: '11:20',
  replyToThread: false,
  botToken: '',
  channelId: '',
  threadSearchText: '',
  dmReminder: {
    enabled: false,
    schedules: [
      { time: '10:30', message: '오늘의 지라 업무를 최신화 하셨나요?' },
      { time: '15:00', message: '계획하신 업무 일정에 변경사항이나 이슈로 인한 일정 변동은 없나요?' },
      { time: '18:30', message: '오늘 업무내용을 정리해보세요.' },
    ],
    userMappings: [],
  },
};

export default function TeamManagement({ teams, allAssignees, onChange, draft, onDraftChange }: Props) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');

  const addTeam = () => {
    const name = newTeamName.trim();
    if (!name) return;

    const usedColors = new Set(teams.map((t) => t.color));
    const nextColor = TEAM_COLORS.find((c) => !usedColors.has(c)) ?? TEAM_COLORS[0];

    const newTeam: Team = {
      id: crypto.randomUUID().slice(0, 8),
      name,
      color: nextColor,
      assignees: [],
      slack: { ...DEFAULT_SLACK },
    };

    onChange([...teams, newTeam]);
    setNewTeamName('');
    setExpandedTeamId(newTeam.id);
  };

  const removeTeam = (teamId: string) => {
    onChange(teams.filter((t) => t.id !== teamId));
    if (expandedTeamId === teamId) setExpandedTeamId(null);
  };

  const updateTeam = (teamId: string, patch: Partial<Team>) => {
    const updated = teams.map((t) => (t.id === teamId ? { ...t, ...patch } : t));
    onChange(updated);
  };

  const toggleAssignee = (teamId: string, assignee: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;

    const next = team.assignees.includes(assignee)
      ? team.assignees.filter((a) => a !== assignee)
      : [...team.assignees, assignee];
    updateTeam(teamId, { assignees: next });
  };

  const updateTeamSlack = (teamId: string, slack: SlackSettings) => {
    updateTeam(teamId, { slack });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        팀을 만들어 담당자를 그룹으로 관리합니다. 팀별로 슬랙 알림, DM 리마인더를 따로 설정할 수 있습니다.
      </p>

      {/* 팀 추가 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTeam()}
          placeholder="새 팀 이름 (예: FE팀, 앱팀)"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button variant="primary" onClick={addTeam} disabled={!newTeamName.trim()}>
          추가
        </Button>
      </div>

      {/* 팀 목록 */}
      {teams.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          아직 팀이 없습니다. 위에서 팀을 추가해보세요.
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => {
            const isExpanded = expandedTeamId === team.id;
            return (
              <div
                key={team.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* 팀 헤더 */}
                <button
                  onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="text-sm font-medium text-gray-900 flex-1 text-left">
                    {team.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {team.assignees.length}명
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* 팀 상세 */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
                    {/* 팀 이름 & 색상 */}
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) => updateTeam(team.id, { name: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-1">
                        {TEAM_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => updateTeam(team.id, { color })}
                            className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                              team.color === color ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'hover:scale-110'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* 멤버 할당 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        담당자 ({team.assignees.length}명 선택)
                      </label>
                      {allAssignees.length === 0 ? (
                        <p className="text-xs text-gray-400">
                          수집 대상 설정에서 담당자를 먼저 추가해주세요.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {allAssignees.map((assignee) => {
                            const selected = team.assignees.includes(assignee);
                            return (
                              <button
                                key={assignee}
                                onClick={() => toggleAssignee(team.id, assignee)}
                                className={`
                                  px-3 py-1.5 text-xs rounded-full cursor-pointer transition-colors
                                  ${selected
                                    ? 'text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                                `}
                                style={selected ? { backgroundColor: team.color } : undefined}
                              >
                                {assignee}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 팀별 슬랙 설정 */}
                    <div className="border-t border-gray-100 pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">팀 슬랙 설정</h4>
                      <SlackConfig
                        enabled={team.slack.enabled}
                        webhookUrl={team.slack.webhookUrl}
                        dailyReportTime={team.slack.dailyReportTime}
                        replyToThread={team.slack.replyToThread}
                        botToken={team.slack.botToken}
                        channelId={team.slack.channelId}
                        threadSearchText={team.slack.threadSearchText}
                        onToggle={(enabled) =>
                          updateTeamSlack(team.id, { ...team.slack, enabled })
                        }
                        onChangeWebhookUrl={(webhookUrl) =>
                          updateTeamSlack(team.id, { ...team.slack, webhookUrl })
                        }
                        onChangeDailyReportTime={(dailyReportTime) =>
                          updateTeamSlack(team.id, { ...team.slack, dailyReportTime })
                        }
                        onChangeReplyToThread={(replyToThread) =>
                          updateTeamSlack(team.id, { ...team.slack, replyToThread })
                        }
                        onChangeBotToken={(botToken) =>
                          updateTeamSlack(team.id, { ...team.slack, botToken })
                        }
                        onChangeChannelId={(channelId) =>
                          updateTeamSlack(team.id, { ...team.slack, channelId })
                        }
                        onChangeThreadSearchText={(threadSearchText) =>
                          updateTeamSlack(team.id, { ...team.slack, threadSearchText })
                        }
                      />
                      {team.slack.enabled && (
                        <DMReminderConfig
                          dmReminder={team.slack.dmReminder}
                          botToken={team.slack.botToken}
                          assignees={team.assignees}
                          onChange={(dmReminder) =>
                            updateTeamSlack(team.id, { ...team.slack, dmReminder })
                          }
                        />
                      )}
                    </div>

                    {/* 팀 삭제 */}
                    <div className="border-t border-gray-100 pt-4">
                      <Button
                        variant="danger"
                        onClick={() => removeTeam(team.id)}
                      >
                        팀 삭제
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
