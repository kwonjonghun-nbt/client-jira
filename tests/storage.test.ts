import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    rename: vi.fn(),
    mkdir: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn(),
    rm: vi.fn(),
    access: vi.fn(),
  },
}));

vi.mock('../src/main/services/paths', () => ({
  getDataDir: () => '/mock/data',
  getRawDir: () => '/mock/data/raw',
  getLatestPath: () => '/mock/data/latest.json',
  getMetaPath: () => '/mock/data/meta.json',
  getSettingsPath: () => '/mock/settings.json',
  getSnapshotDir: () => '/mock/data/raw/2025-01-15',
  getSnapshotPath: () => '/mock/data/raw/2025-01-15/10-00.json',
  getLabelNotesPath: () => '/mock/label-notes.json',
  getReportsDir: () => '/mock/reports',
  getChangelogPath: () => '/mock/data/changelog.json',
  getOKRPath: () => '/mock/okr.json',
}));

vi.mock('../src/main/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../src/main/utils/okr-migration', () => ({
  migrateOKRRelations: vi.fn((data: unknown) => data),
}));

import fs from 'node:fs/promises';
import { StorageService } from '../src/main/services/storage';
import type { NormalizedIssue } from '../src/main/schemas/storage.schema';

const mockFs = fs as unknown as {
  readFile: ReturnType<typeof vi.fn>;
  writeFile: ReturnType<typeof vi.fn>;
  rename: ReturnType<typeof vi.fn>;
  mkdir: ReturnType<typeof vi.fn>;
  stat: ReturnType<typeof vi.fn>;
  readdir: ReturnType<typeof vi.fn>;
  unlink: ReturnType<typeof vi.fn>;
  rm: ReturnType<typeof vi.fn>;
  access: ReturnType<typeof vi.fn>;
};

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

const VALID_STORED_DATA = {
  syncedAt: '2025-01-15T10:00:00Z',
  source: { baseUrl: 'https://jira.test.com', projects: ['TEST'] },
  issues: [makeNormalizedIssue('TEST-1')],
  totalCount: 1,
};

const VALID_SETTINGS = {
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
};

const VALID_CHANGELOG_DATA = {
  syncedAt: '2025-01-15T10:00:00Z',
  entries: [
    {
      issueKey: 'TEST-1',
      summary: 'Test issue',
      changeType: 'created' as const,
      oldValue: null,
      newValue: null,
      detectedAt: '2025-01-15T10:00:00Z',
    },
  ],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.rename.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ size: 100, mtime: new Date('2025-01-15T10:00:00Z') });
    mockFs.readdir.mockResolvedValue([]);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.rm.mockResolvedValue(undefined);
    mockFs.access.mockResolvedValue(undefined);
    service = new StorageService();
  });

  // ─── loadSettings ──────────────────────────────────────────────────────────

  describe('loadSettings', () => {
    it('유효한 설정을 로드한다', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(VALID_SETTINGS));

      const result = await service.loadSettings();

      expect(result.jira.baseUrl).toBe('https://jira.test.com');
      expect(result.jira.email).toBe('user@test.com');
      expect(result.collection.projects).toEqual(['TEST']);
      expect(result.storage.retentionDays).toBe(30);
    });

    it('부분 유효 설정은 기본값과 머지한다', async () => {
      // jira 필드는 있지만 collection 등이 유효하지 않아 safeParse 실패
      // merged = { ...DEFAULT_SETTINGS, ...partial } 이 성공할 경우 반환
      const partialSettings = {
        jira: { baseUrl: 'https://jira.test.com', email: 'user@test.com' },
        // collection, schedule, storage 생략 → SettingsSchema.safeParse 실패
        // 하지만 merge 후 DEFAULT_SETTINGS의 기본값으로 채워지면 성공
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(partialSettings));

      const result = await service.loadSettings();

      // 머지 결과: jira는 partial에서, 나머지는 DEFAULT_SETTINGS에서
      expect(result.jira.baseUrl).toBe('https://jira.test.com');
      // 기본값이 적용된 필드
      expect(result.schedule.enabled).toBe(true);
      expect(result.collection.projects).toEqual([]);
    });

    it('파일이 없으면 DEFAULT_SETTINGS를 반환한다', async () => {
      mockFs.readFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const result = await service.loadSettings();

      expect(result.jira.baseUrl).toBe('');
      expect(result.jira.email).toBe('');
      expect(result.schedule.enabled).toBe(true);
      expect(result.storage.retentionDays).toBe(90);
    });
  });

  // ─── saveSettings ──────────────────────────────────────────────────────────

  describe('saveSettings', () => {
    it('유효한 설정을 저장한다', async () => {
      await service.saveSettings(VALID_SETTINGS);

      // atomicWrite: writeFile(tmp) + rename(tmp → target)
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('/mock/settings.json.tmp-'),
        expect.stringContaining('"baseUrl": "https://jira.test.com"'),
        'utf-8',
      );
      expect(mockFs.rename).toHaveBeenCalled();
    });

    it('유효하지 않은 설정은 throw한다', async () => {
      const invalidSettings = { jira: { baseUrl: 123 } }; // baseUrl should be string

      await expect(service.saveSettings(invalidSettings)).rejects.toThrow(
        'Settings validation failed',
      );
    });
  });

  // ─── getLatest ─────────────────────────────────────────────────────────────

  describe('getLatest', () => {
    it('저장된 데이터를 반환한다', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(VALID_STORED_DATA));

      const result = await service.getLatest();

      expect(result).not.toBeNull();
      expect(result!.totalCount).toBe(1);
      expect(result!.issues[0].key).toBe('TEST-1');
      expect(result!.source.baseUrl).toBe('https://jira.test.com');
    });

    it('파일이 없으면 null을 반환한다', async () => {
      mockFs.readFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const result = await service.getLatest();

      expect(result).toBeNull();
    });
  });

  // ─── appendChangelog ───────────────────────────────────────────────────────

  describe('appendChangelog', () => {
    it('새 엔트리를 기존 데이터 앞에 추가한다', async () => {
      const existingEntry = {
        issueKey: 'TEST-0',
        summary: 'Old issue',
        changeType: 'status' as const,
        oldValue: 'To Do',
        newValue: 'Done',
        detectedAt: '2025-01-14T10:00:00Z',
      };
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({
          syncedAt: '2025-01-14T10:00:00Z',
          entries: [existingEntry],
        }),
      );

      const newEntry = {
        issueKey: 'TEST-1',
        summary: 'New issue',
        changeType: 'created' as const,
        oldValue: null,
        newValue: null,
        detectedAt: '2025-01-15T10:00:00Z',
      };

      await service.appendChangelog([newEntry], '2025-01-15T10:00:00Z');

      const writeCall = mockFs.writeFile.mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written.entries).toHaveLength(2);
      // 새 엔트리가 앞에 위치
      expect(written.entries[0].issueKey).toBe('TEST-1');
      expect(written.entries[1].issueKey).toBe('TEST-0');
    });

    it('최대 500개로 제한한다', async () => {
      // 기존 499개 엔트리
      const existingEntries = Array.from({ length: 499 }, (_, i) => ({
        issueKey: `TEST-${i}`,
        summary: `Issue ${i}`,
        changeType: 'created' as const,
        oldValue: null,
        newValue: null,
        detectedAt: '2025-01-14T10:00:00Z',
      }));
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({
          syncedAt: '2025-01-14T10:00:00Z',
          entries: existingEntries,
        }),
      );

      // 새 엔트리 10개 추가 → 총 509개이지만 500개로 잘려야 한다
      const newEntries = Array.from({ length: 10 }, (_, i) => ({
        issueKey: `NEW-${i}`,
        summary: `New issue ${i}`,
        changeType: 'status' as const,
        oldValue: 'To Do',
        newValue: 'Done',
        detectedAt: '2025-01-15T10:00:00Z',
      }));

      await service.appendChangelog(newEntries, '2025-01-15T10:00:00Z');

      const writeCall = mockFs.writeFile.mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written.entries).toHaveLength(500);
    });
  });

  // ─── validateReportPath ────────────────────────────────────────────────────

  describe('validateReportPath', () => {
    it('정상 경로를 허용한다', async () => {
      mockFs.readFile.mockResolvedValue('# Report content');

      const result = await service.getReport('report.md');

      expect(result).toBe('# Report content');
      expect(mockFs.readFile).toHaveBeenCalledWith('/mock/reports/report.md', 'utf-8');
    });

    it('path traversal을 차단한다 (../../)', async () => {
      const result = await service.getReport('../../etc/passwd');

      // validateReportPath가 throw하므로 getReport는 null을 반환
      expect(result).toBeNull();
    });
  });

  // ─── saveReport ────────────────────────────────────────────────────────────

  describe('saveReport', () => {
    it('파일명을 sanitize한다', async () => {
      await service.saveReport('report/name:with*chars?.md', '# Content');

      // atomicWrite는 tmp 경로로 writeFile을 호출하므로 rename 호출 대상(tmp → 최종)을 확인
      // rename(tmpPath, finalPath)에서 finalPath의 basename을 검사
      const renameCall = mockFs.rename.mock.calls[0];
      const finalPath = renameCall[1] as string;
      const basename = finalPath.split('/').pop()!;
      // 특수문자가 _로 치환되어야 한다 (reportsDir 경로 구분자 /는 제외)
      expect(basename).not.toContain(':');
      expect(basename).not.toContain('*');
      expect(basename).not.toContain('?');
      // 원래 파일명의 / 는 _로 치환됨
      expect(basename).toMatch(/^report_name_with_chars_\.md$/);
    });

    it('.md 확장자가 없으면 자동으로 추가한다', async () => {
      await service.saveReport('myreport', '# Content');

      // rename의 두 번째 인수(최종 경로)가 .md로 끝나야 한다
      const renameCall = mockFs.rename.mock.calls[0];
      const finalPath = renameCall[1] as string;
      expect(finalPath).toMatch(/myreport\.md$/);
    });
  });

  // ─── cleanupOldData ────────────────────────────────────────────────────────

  describe('cleanupOldData', () => {
    it('보관 기간이 지난 데이터를 삭제한다', async () => {
      // 오래된 디렉토리 이름 (30일 기준 → 31일 이전)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      const oldDirName = oldDate.toISOString().split('T')[0]; // YYYY-MM-DD

      // 최신 디렉토리 이름
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1);
      const recentDirName = recentDate.toISOString().split('T')[0];

      mockFs.readdir.mockResolvedValue([oldDirName, recentDirName, 'not-a-date']);

      await service.cleanupOldData(30);

      // 오래된 디렉토리만 삭제
      expect(mockFs.rm).toHaveBeenCalledWith(`/mock/data/raw/${oldDirName}`, { recursive: true });
      expect(mockFs.rm).not.toHaveBeenCalledWith(
        `/mock/data/raw/${recentDirName}`,
        expect.anything(),
      );
      // 날짜 형식이 아닌 항목은 건너뜀
      expect(mockFs.rm).not.toHaveBeenCalledWith(
        '/mock/data/raw/not-a-date',
        expect.anything(),
      );
    });
  });

  // ─── atomicWrite ───────────────────────────────────────────────────────────

  describe('atomicWrite', () => {
    it('임시 파일을 쓰고 rename한다', async () => {
      await service.saveSettings(VALID_SETTINGS);

      // writeFile은 tmp 경로로 호출
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/\/mock\/settings\.json\.tmp-\d+$/),
        expect.any(String),
        'utf-8',
      );
      // rename은 tmp → 최종 경로
      const tmpPath = mockFs.writeFile.mock.calls[0][0] as string;
      expect(mockFs.rename).toHaveBeenCalledWith(tmpPath, '/mock/settings.json');
    });
  });
});
