interface IssueSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export default function IssueSearch({ value, onChange }: IssueSearchProps) {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="키 또는 제목으로 검색..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-64 pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
        🔍
      </span>
    </div>
  );
}
