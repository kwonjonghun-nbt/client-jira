import { useUIStore } from '../../store/uiStore';
import { useTerminalStore } from '../../store/terminalStore';

export default function Sidebar() {
  const currentPage = useUIStore((s) => s.currentPage);
  const setPage = useUIStore((s) => s.setPage);
  const expanded = useUIStore((s) => s.sidebarExpanded);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const isTerminalOpen = useTerminalStore((s) => s.isOpen);
  const toggleTerminal = useTerminalStore((s) => s.toggleTerminal);

  const navItems = [
    { page: 'dashboard' as const, label: '대시보드', icon: '🏠' },
    { page: 'main' as const, label: '과제', icon: '📋' },
    { page: 'timeline' as const, label: '타임라인', icon: '📅' },
    { page: 'stats' as const, label: '통계', icon: '📊' },
    { page: 'label-notes' as const, label: '라벨 메모', icon: '🏷️' },
    { page: 'reports' as const, label: '리포트', icon: '📄' },
    { page: 'okr' as const, label: 'OKR', icon: '🎯' },
    { page: 'settings' as const, label: '설정', icon: '⚙️' },
  ];

  return (
    <aside
      className={`
        ${expanded ? 'w-48' : 'w-16'}
        bg-gray-900 flex flex-col py-4 gap-2 shrink-0
        transition-[width] duration-200 ease-in-out overflow-hidden
      `}
    >
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center text-white font-bold text-xs mb-4 cursor-pointer hover:text-blue-400 transition-colors mx-auto"
      >
        {expanded ? '◀ CJ' : 'CJ'}
      </button>

      {navItems.map((item) => (
        <button
          key={item.page}
          onClick={() => setPage(item.page)}
          title={expanded ? undefined : item.label}
          className={`
            mx-3 h-10 rounded-lg flex items-center gap-3 text-lg
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
        onClick={toggleTerminal}
        title={expanded ? undefined : 'Claude 터미널'}
        className={`
          mx-3 h-10 rounded-lg flex items-center gap-3 text-lg
          transition-colors cursor-pointer
          ${expanded ? 'px-3' : 'justify-center'}
          ${isTerminalOpen
            ? 'bg-purple-600 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
        `}
      >
        <span className="shrink-0">🤖</span>
        {expanded && (
          <span className="text-sm truncate">Claude 터미널</span>
        )}
      </button>
    </aside>
  );
}
