import { useState, useRef } from 'react';
import { useOnClickOutside } from 'usehooks-ts';

interface MultiSelectProps {
  placeholder: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}

export default function MultiSelect({ placeholder, options, selected, onToggle }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

  useOnClickOutside(ref, () => setOpen(false));

  const label = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? selected[0]
      : `${selected[0]} 외 ${selected.length - 1}건`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          flex items-center gap-1 min-w-[120px]"
      >
        <span className={`flex-1 text-left truncate ${selected.length === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
          {label}
        </span>
        <svg className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && options.length > 0 && (
        <div className="absolute z-50 mt-1 w-full min-w-[160px] bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(opt.value)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="truncate">{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
