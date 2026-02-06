import { useUIStore } from '../../store/uiStore';

export default function Sidebar() {
  const currentPage = useUIStore((s) => s.currentPage);
  const setPage = useUIStore((s) => s.setPage);

  const navItems = [
    { page: 'main' as const, label: '과제', icon: '📋' },
    { page: 'timeline' as const, label: '타임라인', icon: '📅' },
    { page: 'settings' as const, label: '설정', icon: '⚙️' },
  ];

  return (
    <aside className="w-16 bg-gray-900 flex flex-col items-center py-4 gap-2 shrink-0">
      <div className="text-white font-bold text-xs mb-4">CJ</div>
      {navItems.map((item) => (
        <button
          key={item.page}
          onClick={() => setPage(item.page)}
          title={item.label}
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center text-lg
            transition-colors cursor-pointer
            ${currentPage === item.page
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
          `}
        >
          {item.icon}
        </button>
      ))}
    </aside>
  );
}
