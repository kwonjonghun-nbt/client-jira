import Input from '../common/Input';

interface StorageConfigProps {
  retentionDays: number;
  onChangeRetention: (days: number) => void;
}

export default function StorageConfig({ retentionDays, onChangeRetention }: StorageConfigProps) {
  return (
    <div className="space-y-3">
      <div className="max-w-xs">
        <Input
          label="데이터 보존 기간 (일)"
          type="number"
          min={1}
          max={365}
          value={retentionDays}
          onChange={(e) => onChangeRetention(Number(e.target.value))}
        />
        <p className="text-xs text-gray-400 mt-1">
          설정 기간이 지난 스냅샷은 자동으로 삭제됩니다
        </p>
      </div>
    </div>
  );
}
