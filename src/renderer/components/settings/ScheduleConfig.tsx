import Button from '../common/Button';

interface ScheduleConfigProps {
  enabled: boolean;
  times: string[];
  onToggle: (enabled: boolean) => void;
  onChangeTimes: (times: string[]) => void;
}

export default function ScheduleConfig({
  enabled,
  times,
  onToggle,
  onChangeTimes,
}: ScheduleConfigProps) {
  const addTime = () => {
    onChangeTimes([...times, '12:00']);
  };

  const removeTime = (index: number) => {
    onChangeTimes(times.filter((_, i) => i !== index));
  };

  const updateTime = (index: number, value: string) => {
    const updated = [...times];
    updated[index] = value;
    onChangeTimes(updated);
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="rounded border-gray-300"
        />
        <span className="text-sm font-medium text-gray-700">자동 수집 활성화</span>
      </label>

      {enabled && (
        <div className="space-y-2 pl-6">
          {times.map((time, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="time"
                value={time}
                onChange={(e) => updateTime(index, e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {times.length > 1 && (
                <button
                  onClick={() => removeTime(index)}
                  className="text-gray-400 hover:text-red-500 text-sm cursor-pointer"
                >
                  삭제
                </button>
              )}
            </div>
          ))}
          {times.length < 6 && (
            <Button variant="ghost" size="sm" onClick={addTime}>
              + 시간 추가
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
