import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/main/utils/normalize', () => ({
  normalizeIssues: vi.fn(() => []),
}));

vi.mock('../src/main/utils/diff', () => ({
  diffIssues: vi.fn(() => []),
}));

vi.mock('../src/main/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { normalizeIssues } from '../src/main/utils/normalize';
import { diffIssues } from '../src/main/utils/diff';
import { SyncService } from '../src/main/services/sync';
import type { NormalizedIssue } from '../src/main/schemas/storage.schema';
import type { Settings } from '../src/main/schemas/settings.schema';

const mockNormalizeIssues = normalizeIssues as ReturnType<typeof vi.fn>;
const mockDiffIssues = diffIssues as ReturnType<typeof vi.fn>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeNormalizedIssue(key: string): NormalizedIssue {
  return {
    key,
    summary: 'Test issue',
    description: null,
    status: 'To Do',
    statusCategory: 'new',
    assignee: null,
    reporter: null,
    priority: 'Medium',
    issueType: 'Task',
    storyPoints: null,
    sprint: null,
    labels: [],
    components: [],
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z',
    startDate: null,
    dueDate: null,
    resolution: null,
    timeTracking: null,
    parent: null,
    subtasks: [],
    issueLinks: [],
  };
}

const MOCK_SETTINGS: Settings = {
  jira: { baseUrl: 'https://jira.test.com', email: 'user@test.com' },
  collection: { projects: ['TEST'], assignees: [], customJql: '' },
  schedule: { enabled: true, times: ['09:00', '13:00', '18:00'] },
  storage: { retentionDays: 30 },
  slack: {
    enabled: false,
    webhookUrl: '',
    dailyReportTime: '11:20',
    replyToThread: false,
    botToken: '',
    channelId: '',
    threadSearchText: '',
    dmReminder: {
      enabled: false,
      schedules: [
        { time: '10:30', message: '오늘의 지라 업무를 최신화 하셨나요?' },
        { time: '15:00', message: '계획하신 업무 일정에 변경사항이나 이슈로 인한 일정 변동은 없나요?' },
        { time: '18:30', message: '오늘 업무내용을 정리해보세요.' },
      ],
      userMappings: [],
    },
  },
  email: { enabled: false, senderEmail: '', clientId: '', clientSecret: '' },
  teams: [],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SyncService', () => {
  let mockStorage: {
    getLatest: ReturnType<typeof vi.fn>;
    saveLatest: ReturnType<typeof vi.fn>;
    saveSnapshot: ReturnType<typeof vi.fn>;
    getMeta: ReturnType<typeof vi.fn>;
    saveMeta: ReturnType<typeof vi.fn>;
    appendChangelog: ReturnType<typeof vi.fn>;
    cleanupOldData: ReturnType<typeof vi.fn>;
  };

  let mockJiraClient: {
    buildJql: ReturnType<typeof vi.fn>;
    fetchAllIssues: ReturnType<typeof vi.fn>;
  };

  let service: SyncService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStorage = {
      getLatest: vi.fn().mockResolvedValue(null),
      saveLatest: vi.fn().mockResolvedValue(undefined),
      saveSnapshot: vi.fn().mockResolvedValue(undefined),
      getMeta: vi.fn().mockResolvedValue({ lastSync: null, syncHistory: [] }),
      saveMeta: vi.fn().mockResolvedValue(undefined),
      appendChangelog: vi.fn().mockResolvedValue(undefined),
      cleanupOldData: vi.fn().mockResolvedValue(undefined),
    };

    mockJiraClient = {
      buildJql: vi.fn().mockReturnValue('project = TEST'),
      fetchAllIssues: vi.fn().mockResolvedValue([]),
    };

    mockNormalizeIssues.mockReturnValue([]);
    mockDiffIssues.mockReturnValue([]);

    service = new SyncService(
      mockStorage as never,
      mockJiraClient as never,
      MOCK_SETTINGS,
    );
  });

  // ─── 정상 동기화 ──────────────────────────────────────────────────────────

  it('정상 동기화 — 이슈를 가져와 저장하고 성공 결과를 반환한다', async () => {
    const issues = [makeNormalizedIssue('TEST-1'), makeNormalizedIssue('TEST-2')];
    mockNormalizeIssues.mockReturnValue(issues);
    mockJiraClient.fetchAllIssues.mockResolvedValue([{}, {}]);

    const result = await service.performSync('manual');

    expect(result.success).toBe(true);
    expect(result.issueCount).toBe(2);
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
    expect(mockStorage.saveLatest).toHaveBeenCalledWith(
      expect.objectContaining({ issues, totalCount: 2 }),
    );
    expect(mockStorage.saveSnapshot).toHaveBeenCalled();
    expect(mockStorage.saveMeta).toHaveBeenCalled();
  });

  // ─── 중복 실행 방지 ────────────────────────────────────────────────────────

  it('이미 진행 중이면 에러 결과를 반환한다', async () => {
    // 첫 번째 sync를 시작하되 완료하지 않음
    let resolveFirstSync!: () => void;
    mockJiraClient.fetchAllIssues.mockReturnValue(
      new Promise((resolve) => {
        resolveFirstSync = () => resolve([]);
      }),
    );

    const firstSync = service.performSync('scheduled');

    // 두 번째 sync 시도 (첫 번째가 진행 중)
    const secondResult = await service.performSync('manual');

    expect(secondResult.success).toBe(false);
    expect(secondResult.error).toBe('동기화가 이미 진행 중입니다');
    expect(secondResult.issueCount).toBe(0);
    expect(secondResult.duration).toBe(0);

    // 첫 번째 완료
    resolveFirstSync();
    await firstSync;
  });

  // ─── diff 계산 및 changelog ────────────────────────────────────────────────

  it('이전 데이터와 diff를 계산하여 changelog에 추가한다', async () => {
    const prevIssues = [makeNormalizedIssue('TEST-1')];
    const newIssues = [makeNormalizedIssue('TEST-1'), makeNormalizedIssue('TEST-2')];
    const changes = [
      {
        issueKey: 'TEST-2',
        summary: 'New issue',
        changeType: 'created' as const,
        oldValue: null,
        newValue: null,
        detectedAt: '2025-01-15T10:00:00Z',
      },
    ];

    mockStorage.getLatest.mockResolvedValue({
      syncedAt: '2025-01-14T10:00:00Z',
      source: { baseUrl: 'https://jira.test.com', projects: ['TEST'] },
      issues: prevIssues,
      totalCount: 1,
    });
    mockNormalizeIssues.mockReturnValue(newIssues);
    mockDiffIssues.mockReturnValue(changes);

    await service.performSync('manual');

    expect(mockDiffIssues).toHaveBeenCalledWith(prevIssues, newIssues, expect.any(String));
    expect(mockStorage.appendChangelog).toHaveBeenCalledWith(changes, expect.any(String));
  });

  it('이전 데이터가 없으면 changelog를 건너뛴다', async () => {
    mockStorage.getLatest.mockResolvedValue(null);
    mockNormalizeIssues.mockReturnValue([makeNormalizedIssue('TEST-1')]);

    await service.performSync('manual');

    expect(mockDiffIssues).not.toHaveBeenCalled();
    expect(mockStorage.appendChangelog).not.toHaveBeenCalled();
  });

  it('diff 결과가 빈 배열이면 changelog를 추가하지 않는다', async () => {
    mockStorage.getLatest.mockResolvedValue({
      syncedAt: '2025-01-14T10:00:00Z',
      source: { baseUrl: 'https://jira.test.com', projects: ['TEST'] },
      issues: [makeNormalizedIssue('TEST-1')],
      totalCount: 1,
    });
    mockNormalizeIssues.mockReturnValue([makeNormalizedIssue('TEST-1')]);
    mockDiffIssues.mockReturnValue([]); // 변경 없음

    await service.performSync('manual');

    expect(mockDiffIssues).toHaveBeenCalled();
    expect(mockStorage.appendChangelog).not.toHaveBeenCalled();
  });

  // ─── 동기화 실패 ──────────────────────────────────────────────────────────

  it('동기화 실패 시 에러 정보를 meta에 기록한다', async () => {
    mockJiraClient.fetchAllIssues.mockRejectedValue(new Error('Network error'));

    const result = await service.performSync('scheduled');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
    expect(mockStorage.saveMeta).toHaveBeenCalledWith(
      expect.objectContaining({
        syncHistory: expect.arrayContaining([
          expect.objectContaining({
            success: false,
            error: 'Network error',
            type: 'scheduled',
          }),
        ]),
      }),
    );
  });

  // ─── syncHistory 100개 제한 ────────────────────────────────────────────────

  it('syncHistory를 최대 100개로 제한한다', async () => {
    const existingHistory = Array.from({ length: 100 }, (_, i) => ({
      timestamp: `2025-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
      type: 'scheduled' as const,
      issueCount: 5,
      duration: 1000,
      success: true,
    }));
    mockStorage.getMeta.mockResolvedValue({
      lastSync: '2025-01-14T10:00:00Z',
      syncHistory: existingHistory,
    });

    await service.performSync('manual');

    const savedMeta = mockStorage.saveMeta.mock.calls[0][0];
    expect(savedMeta.syncHistory).toHaveLength(100);
    // 새 엔트리가 앞에 추가되고 오래된 것이 잘림
    expect(savedMeta.syncHistory[0].type).toBe('manual');
  });

  // ─── mainWindow progress 전송 ─────────────────────────────────────────────

  it('mainWindow에 진행 상황을 전송한다', async () => {
    const mockSend = vi.fn();
    const mockMainWindow = {
      webContents: { send: mockSend },
    } as never;

    // fetchAllIssues가 progress 콜백을 호출하도록 설정
    mockJiraClient.fetchAllIssues.mockImplementation(
      async (_jql: string, onProgress: (current: number, total: number) => void) => {
        onProgress(5, 10);
        onProgress(10, 10);
        return [];
      },
    );

    await service.performSync('manual', mockMainWindow);

    // progress 이벤트 전송 확인
    expect(mockSend).toHaveBeenCalledWith('sync:progress', {
      current: 5,
      total: 10,
      percentage: 50,
    });
    expect(mockSend).toHaveBeenCalledWith('sync:progress', {
      current: 10,
      total: 10,
      percentage: 100,
    });
    // 완료 이벤트 전송 확인
    expect(mockSend).toHaveBeenCalledWith('sync:complete');
  });

  it('mainWindow가 없어도 에러 없이 동작한다', async () => {
    await expect(service.performSync('manual', null)).resolves.toBeDefined();
    await expect(service.performSync('manual', undefined)).resolves.toBeDefined();
  });

  // ─── isRunning 복원 ────────────────────────────────────────────────────────

  it('완료 후 isRunning을 false로 복원한다', async () => {
    await service.performSync('manual');

    const status = service.getStatus();
    expect(status.isRunning).toBe(false);
  });

  it('에러 시에도 isRunning을 false로 복원한다', async () => {
    mockJiraClient.fetchAllIssues.mockRejectedValue(new Error('Failure'));

    await service.performSync('manual');

    const status = service.getStatus();
    expect(status.isRunning).toBe(false);
  });

  // ─── getStatus ─────────────────────────────────────────────────────────────

  describe('getStatus', () => {
    it('초기 상태를 반환한다', () => {
      const status = service.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.lastSync).toBeNull();
      expect(status.lastResult).toBeNull();
    });

    it('동기화 후 현재 상태를 반환한다', async () => {
      const issues = [makeNormalizedIssue('TEST-1')];
      mockNormalizeIssues.mockReturnValue(issues);

      await service.performSync('manual');

      const status = service.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.lastSync).not.toBeNull();
      expect(status.lastResult).not.toBeNull();
      expect(status.lastResult!.success).toBe(true);
      expect(status.lastResult!.issueCount).toBe(1);
      expect(status.lastResult!.type).toBe('manual');
    });

    it('실패 후 에러 정보를 포함한 상태를 반환한다', async () => {
      mockJiraClient.fetchAllIssues.mockRejectedValue(new Error('API error'));

      await service.performSync('scheduled');

      const status = service.getStatus();
      expect(status.lastResult!.success).toBe(false);
      expect(status.lastResult!.error).toBe('API error');
    });
  });

  // ─── updateSettings / updateJiraClient ────────────────────────────────────

  describe('updateSettings / updateJiraClient', () => {
    it('updateSettings가 내부 설정을 갱신한다', async () => {
      const newSettings: Settings = {
        ...MOCK_SETTINGS,
        jira: { baseUrl: 'https://new-jira.com', email: 'new@test.com' },
        storage: { retentionDays: 7 },
      };

      service.updateSettings(newSettings);
      await service.performSync('manual');

      // cleanupOldData는 갱신된 retentionDays(7)로 호출되어야 함
      expect(mockStorage.cleanupOldData).toHaveBeenCalledWith(7);
      // saveLatest의 데이터에는 새 baseUrl이 반영됨
      expect(mockStorage.saveLatest).toHaveBeenCalledWith(
        expect.objectContaining({
          source: expect.objectContaining({ baseUrl: 'https://new-jira.com' }),
        }),
      );
    });

    it('updateJiraClient가 내부 jiraClient를 갱신한다', async () => {
      const newJiraClient = {
        buildJql: vi.fn().mockReturnValue('project = NEW'),
        fetchAllIssues: vi.fn().mockResolvedValue([]),
      };

      service.updateJiraClient(newJiraClient as never);
      await service.performSync('manual');

      expect(newJiraClient.buildJql).toHaveBeenCalled();
      expect(newJiraClient.fetchAllIssues).toHaveBeenCalledWith(
        'project = NEW',
        expect.any(Function),
      );
      // 이전 jiraClient는 호출되지 않아야 함
      expect(mockJiraClient.fetchAllIssues).not.toHaveBeenCalled();
    });
  });
});
