import { useState } from 'react';

interface AssigneeInputProps {
  assignees: string[];
  onChange: (assignees: string[]) => void;
}

export default function AssigneeInput({ assignees, onChange }: AssigneeInputProps) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const value = input.trim();
    if (value && !assignees.includes(value)) {
      onChange([...assignees, value]);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (target: string) => {
    onChange(assignees.filter((a) => a !== target));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">담당자</label>
      <p className="text-xs text-gray-400">
        비워두면 본인(currentUser)만 조회합니다. 추가하면 본인 + 지정 담당자를 조회합니다.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Jira 계정 이메일 또는 displayName"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!input.trim()}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          추가
        </button>
      </div>
      {assignees.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assignees.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded-md"
            >
              {a}
              <button
                type="button"
                onClick={() => handleRemove(a)}
                className="text-blue-400 hover:text-blue-600 cursor-pointer"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
