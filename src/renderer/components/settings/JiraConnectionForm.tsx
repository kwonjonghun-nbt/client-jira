import { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';

interface JiraConnectionFormProps {
  baseUrl: string;
  email: string;
  token: string;
  hasStoredToken: boolean;
  onChangeBaseUrl: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onChangeToken: (v: string) => void;
  onTest: () => Promise<{ url: string; email: string; token: string }>;
  testConnection: {
    mutate: (
      params: { url: string; email: string; token: string },
      options: {
        onSuccess: (result: { success: boolean; displayName?: string; error?: string }) => void;
        onError: (error: Error) => void;
      },
    ) => void;
    isPending: boolean;
  };
}

export default function JiraConnectionForm({
  baseUrl,
  email,
  token,
  hasStoredToken,
  onChangeBaseUrl,
  onChangeEmail,
  onChangeToken,
  onTest,
  testConnection,
}: JiraConnectionFormProps) {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleTest = async () => {
    setTestResult(null);
    const params = await onTest();
    testConnection.mutate(params, {
      onSuccess: (result) => {
        if (result.success) {
          setTestResult({ success: true, message: `연결 성공! (${result.displayName})` });
        } else {
          setTestResult({ success: false, message: result.error || '연결 실패' });
        }
      },
      onError: (error) => {
        setTestResult({ success: false, message: error.message });
      },
    });
  };

  return (
    <div className="space-y-4">
      <Input
        label="Jira URL"
        placeholder="https://your-domain.atlassian.net"
        value={baseUrl}
        onChange={(e) => onChangeBaseUrl(e.target.value)}
      />
      <Input
        label="이메일"
        type="email"
        placeholder="user@company.com"
        value={email}
        onChange={(e) => onChangeEmail(e.target.value)}
      />
      <div>
        <Input
          label="API Token"
          type="password"
          placeholder={hasStoredToken ? '저장된 토큰 있음 (변경하려면 새로 입력)' : 'Jira API 토큰 입력'}
          value={token.startsWith('••') ? '' : token}
          onChange={(e) => onChangeToken(e.target.value)}
        />
        <div className="flex items-center justify-between mt-1">
          {hasStoredToken ? (
            <span className="text-xs text-green-600">토큰 저장됨</span>
          ) : (
            <span className="text-xs text-gray-400">토큰 미설정</span>
          )}
          <a
            href="https://id.atlassian.com/manage-profile/security/api-tokens"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-500 hover:underline"
          >
            API 토큰 발급하기
          </a>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleTest}
          isLoading={testConnection.isPending}
          disabled={!baseUrl || !email || (!token && !hasStoredToken)}
        >
          연결 테스트
        </Button>
        {testResult && (
          <span
            className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}
          >
            {testResult.message}
          </span>
        )}
      </div>
    </div>
  );
}
