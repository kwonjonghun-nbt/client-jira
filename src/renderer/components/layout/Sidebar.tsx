import type { ReactNode } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useAITaskStore } from '../../store/aiTaskStore';
import { countRunningTasks, countCompletedTasks } from '../../utils/ai-tasks';
import {
  HomeIcon,
  ListIcon,
  CalendarIcon,
  ChartBarIcon,
  TagIcon,
  DocumentIcon,
  TargetIcon,
  CogIcon,
  RobotIcon,
} from '../common/Icons';

type Page = 'dashboard' | 'main' | 'timeline' | 'stats' | 'label-notes' | 'reports' | 'okr' | 'settings';

const navItems: { page: Page; label: string; icon: ReactNode }[] = [
  { page: 'dashboard', label: '대시보드', icon: <HomeIcon /> },
  { page: 'main', label: '과제', icon: <ListIcon /> },
  { page: 'timeline', label: '타임라인', icon: <CalendarIcon /> },
  { page: 'stats', label: '통계', icon: <ChartBarIcon /> },
  { page: 'label-notes', label: '라벨 메모', icon: <TagIcon /> },
  { page: 'reports', label: '리포트', icon: <DocumentIcon /> },
  { page: 'okr', label: 'OKR', icon: <TargetIcon /> },
  { page: 'settings', label: '설정', icon: <CogIcon /> },
];

export default function Sidebar() {
  const currentPage = useUIStore((s) => s.currentPage);
  const setPage = useUIStore((s) => s.setPage);
  const expanded = useUIStore((s) => s.sidebarExpanded);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const tasks = useAITaskStore((s) => s.tasks);
  const panelOpen = useAITaskStore((s) => s.panelOpen);
  const togglePanel = useAITaskStore((s) => s.togglePanel);
  const runningCount = countRunningTasks(tasks);
  const completedCount = countCompletedTasks(tasks);

  return (
    <aside
      role="navigation"
      aria-label="메인 내비게이션"
      className={`
        ${expanded ? 'w-48' : 'w-16'}
        bg-gray-900 flex flex-col py-4 gap-2 shrink-0
        transition-[width] duration-200 ease-in-out overflow-hidden
      `}
    >
      <button
        onClick={toggleSidebar}
        aria-label={expanded ? '사이드바 접기' : '사이드바 펼치기'}
        className="flex items-center justify-center text-white font-bold text-xs mb-4 cursor-pointer hover:text-blue-400 transition-colors mx-auto"
      >
        {expanded ? '◀ CJ' : 'CJ'}
      </button>

      {navItems.map((item) => (
        <button
          key={item.page}
          onClick={() => setPage(item.page)}
          title={expanded ? undefined : item.label}
          aria-label={item.label}
          aria-current={currentPage === item.page ? 'page' : undefined}
          className={`
            mx-3 h-10 rounded-lg flex items-center gap-3
            transition-colors cursor-pointer
            ${expanded ? 'px-3' : 'justify-center'}
            ${currentPage === item.page
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
          `}
        >
          <span className="shrink-0">{item.icon}</span>
          {expanded && (
            <span className="text-sm truncate">{item.label}</span>
          )}
        </button>
      ))}

      <div className="flex-1" />

      <button
        onClick={togglePanel}
        title={expanded ? undefined : 'AI 작업'}
        aria-label="AI 작업"
        className={`
          mx-3 h-10 rounded-lg flex items-center gap-3
          transition-colors cursor-pointer relative
          ${expanded ? 'px-3' : 'justify-center'}
          ${panelOpen
            ? 'bg-purple-600 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
          ${runningCount > 0 ? 'animate-pulse' : ''}
        `}
      >
        <span className="shrink-0"><RobotIcon /></span>
        {expanded && (
          <span className="text-sm truncate">AI 작업</span>
        )}
        {runningCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {runningCount}
          </span>
        )}
        {completedCount > 0 && (
          <span className={`absolute -right-1 w-4 h-4 bg-green-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ${runningCount > 0 ? '-bottom-1' : '-top-1'}`}>
            {completedCount}
          </span>
        )}
      </button>
    </aside>
  );
}
