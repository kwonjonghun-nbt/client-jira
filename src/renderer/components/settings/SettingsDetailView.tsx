import type { SettingsSection } from '../../store/uiStore';

const SECTION_TITLES: Record<NonNullable<SettingsSection>, string> = {
  teams: '팀 관리',
  jira: 'Jira 연결',
  collection: '수집 대상',
  schedule: '스케줄',
  storage: '저장',
  slack: '슬랙 리포트',
  email: '이메일 리포트',
  ai: 'AI 에이전트',
  update: '앱 업데이트',
};

interface Props {
  section: NonNullable<SettingsSection>;
  onBack: () => void;
  children: React.ReactNode;
}

export default function SettingsDetailView({ section, onBack, children }: Props) {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer text-sm"
        >
          ← 설정
        </button>
        <h1 className="text-xl font-bold text-gray-900">{SECTION_TITLES[section]}</h1>
      </div>
      {children}
    </div>
  );
}
