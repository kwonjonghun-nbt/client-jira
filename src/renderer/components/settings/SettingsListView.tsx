import type { SettingsSection } from '../../store/uiStore';

interface SettingsCategory {
  key: NonNullable<SettingsSection>;
  title: string;
  description: string;
}

const SETTINGS_CATEGORIES: SettingsCategory[] = [
  { key: 'teams', title: '팀 관리', description: '팀 생성, 멤버 배분, 팀별 슬랙 설정' },
  { key: 'jira', title: 'Jira 연결', description: '서버 URL, 이메일, API 토큰' },
  { key: 'collection', title: '수집 대상', description: '프로젝트, 담당자 필터링' },
  { key: 'schedule', title: '스케줄', description: '자동 동기화 주기 설정' },
  { key: 'storage', title: '저장', description: '데이터 보관 기간' },
  { key: 'email', title: '이메일 리포트', description: 'Gmail OAuth 발송 설정' },
  { key: 'ai', title: 'AI 에이전트', description: 'AI 모델 선택' },
  { key: 'update', title: '앱 업데이트', description: '버전 확인 및 업데이트' },
];

interface Props {
  onSelect: (section: NonNullable<SettingsSection>) => void;
}

export default function SettingsListView({ onSelect }: Props) {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">설정</h1>
      <div className="space-y-1">
        {SETTINGS_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-left"
          >
            <div>
              <div className="text-sm font-medium text-gray-900">{cat.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{cat.description}</div>
            </div>
            <span className="text-gray-400 text-sm">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
