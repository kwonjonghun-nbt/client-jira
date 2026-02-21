import { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useSettings } from '../../hooks/useSettings';

export default function TeamSelector() {
  const selectedTeamId = useUIStore((s) => s.selectedTeamId);
  const setTeam = useUIStore((s) => s.setTeam);
  const expanded = useUIStore((s) => s.sidebarExpanded);
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const teams = settings?.teams ?? [];
  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (teams.length === 0) return null;

  return (
    <div ref={ref} className="mx-3 mb-2 relative">
      <button
        onClick={() => setOpen(!open)}
        title={expanded ? undefined : (selectedTeam?.name ?? '전체')}
        className={`
          w-full h-9 rounded-lg flex items-center gap-2
          bg-gray-800 hover:bg-gray-700 text-gray-200
          transition-colors cursor-pointer
          ${expanded ? 'px-3' : 'justify-center px-0'}
        `}
      >
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: selectedTeam?.color ?? '#6B7280' }}
        />
        {expanded && (
          <>
            <span className="text-sm truncate flex-1 text-left">
              {selectedTeam?.name ?? '전체'}
            </span>
            <svg
              className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 py-1">
          <button
            onClick={() => { setTeam(null); setOpen(false); }}
            className={`
              w-full px-3 py-2 text-sm text-left flex items-center gap-2
              hover:bg-gray-700 cursor-pointer transition-colors
              ${!selectedTeamId ? 'text-white bg-gray-700' : 'text-gray-300'}
            `}
          >
            <span className="w-3 h-3 rounded-full bg-gray-500 shrink-0" />
            전체
          </button>
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => { setTeam(team.id); setOpen(false); }}
              className={`
                w-full px-3 py-2 text-sm text-left flex items-center gap-2
                hover:bg-gray-700 cursor-pointer transition-colors
                ${selectedTeamId === team.id ? 'text-white bg-gray-700' : 'text-gray-300'}
              `}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: team.color }}
              />
              {team.name}
              <span className="text-xs text-gray-500 ml-auto">{team.assignees.length}명</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
