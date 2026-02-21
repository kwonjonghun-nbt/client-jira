import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks must be declared before imports that use them
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((str: string) => Buffer.from('encrypted:' + str)),
    decryptString: vi.fn((buf: Buffer) => buf.toString().replace('encrypted:', '')),
  },
}));

vi.mock('node:fs/promises', () => ({
  default: {
    writeFile: vi.fn(),
    readFile: vi.fn(),
    unlink: vi.fn(),
    access: vi.fn(),
  },
}));

vi.mock('../src/main/services/paths', () => ({
  getTokenPath: () => '/mock/token.enc',
  getGmailTokenPath: () => '/mock/gmail-token.enc',
  getGmailClientSecretPath: () => '/mock/gmail-secret.enc',
  getSlackBotTokenPath: () => '/mock/slack-token.enc',
}));

vi.mock('../src/main/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { safeStorage } from 'electron';
import fs from 'node:fs/promises';
import { CredentialsService } from '../src/main/services/credentials';

const mockSafeStorage = safeStorage as {
  isEncryptionAvailable: ReturnType<typeof vi.fn>;
  encryptString: ReturnType<typeof vi.fn>;
  decryptString: ReturnType<typeof vi.fn>;
};
const mockFs = fs as unknown as {
  writeFile: ReturnType<typeof vi.fn>;
  readFile: ReturnType<typeof vi.fn>;
  unlink: ReturnType<typeof vi.fn>;
  access: ReturnType<typeof vi.fn>;
};

describe('CredentialsService', () => {
  let service: CredentialsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
    mockSafeStorage.encryptString.mockImplementation((str: string) =>
      Buffer.from('encrypted:' + str),
    );
    mockSafeStorage.decryptString.mockImplementation((buf: Buffer) =>
      buf.toString().replace('encrypted:', ''),
    );
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(Buffer.from('encrypted:secret-value'));
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.access.mockResolvedValue(undefined);
    service = new CredentialsService();
  });

  // ─── saveEncrypted (via saveToken) ───────────────────────────────────────

  describe('safeStorage 사용 가능할 때', () => {
    it('safeStorage 사용 가능할 때 암호화하여 저장한다', async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      const encrypted = Buffer.from('encrypted:my-token');
      mockSafeStorage.encryptString.mockReturnValue(encrypted);

      await service.saveToken('my-token');

      expect(mockSafeStorage.encryptString).toHaveBeenCalledWith('my-token');
      expect(mockFs.writeFile).toHaveBeenCalledWith('/mock/token.enc', encrypted);
    });

    it('safeStorage 사용 불가능할 때 base64 폴백으로 저장한다', async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);

      await service.saveToken('my-token');

      expect(mockSafeStorage.encryptString).not.toHaveBeenCalled();
      const base64 = Buffer.from('my-token', 'utf-8').toString('base64');
      expect(mockFs.writeFile).toHaveBeenCalledWith('/mock/token.enc', base64, 'utf-8');
    });
  });

  // ─── readEncrypted (via getToken) ────────────────────────────────────────

  describe('readEncrypted', () => {
    it('암호화된 데이터를 복호화하여 읽는다', async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockFs.readFile.mockResolvedValue(Buffer.from('encrypted:secret-value'));
      mockSafeStorage.decryptString.mockReturnValue('secret-value');

      const result = await service.getToken();

      expect(result).toBe('secret-value');
      expect(mockSafeStorage.decryptString).toHaveBeenCalled();
    });

    it('base64 폴백 데이터를 읽는다', async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);
      const base64 = Buffer.from('my-secret', 'utf-8').toString('base64');
      mockFs.readFile.mockResolvedValue(Buffer.from(base64));

      const result = await service.getToken();

      expect(result).toBe('my-secret');
      expect(mockSafeStorage.decryptString).not.toHaveBeenCalled();
    });

    it('safeStorage 복호화 실패 시 base64 폴백으로 읽는다', async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      const base64 = Buffer.from('fallback-value', 'utf-8').toString('base64');
      mockFs.readFile.mockResolvedValue(Buffer.from(base64));
      mockSafeStorage.decryptString.mockImplementation(() => {
        throw new Error('decryption failed');
      });

      const result = await service.getToken();

      expect(result).toBe('fallback-value');
    });

    it('파일이 없으면 null을 반환한다', async () => {
      mockFs.readFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const result = await service.getToken();

      expect(result).toBeNull();
    });
  });

  // ─── deleteEncrypted (via deleteToken) ───────────────────────────────────

  describe('deleteEncrypted', () => {
    it('토큰을 삭제한다', async () => {
      await service.deleteToken();

      expect(mockFs.unlink).toHaveBeenCalledWith('/mock/token.enc');
    });

    it('존재하지 않는 파일 삭제는 에러 없이 무시한다', async () => {
      mockFs.unlink.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      await expect(service.deleteToken()).resolves.toBeUndefined();
    });
  });

  // ─── hasToken ────────────────────────────────────────────────────────────

  describe('hasToken', () => {
    it('파일이 존재하면 true를 반환한다', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await service.hasToken();

      expect(result).toBe(true);
    });

    it('파일이 없으면 false를 반환한다', async () => {
      mockFs.access.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const result = await service.hasToken();

      expect(result).toBe(false);
    });
  });

  // ─── 각 토큰 타입별 경로 검증 ────────────────────────────────────────────

  describe('토큰 타입별 경로', () => {
    it('API 토큰은 /mock/token.enc 경로를 사용한다', async () => {
      await service.saveToken('api-token');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/mock/token.enc',
        expect.anything(),
        // safeStorage 사용 시 인코딩 옵션 없음
      );

      vi.clearAllMocks();
      mockFs.readFile.mockResolvedValue(Buffer.from('encrypted:api-token'));
      await service.getToken();
      expect(mockFs.readFile).toHaveBeenCalledWith('/mock/token.enc');
    });

    it('Gmail 토큰은 /mock/gmail-token.enc 경로를 사용한다', async () => {
      await service.saveGmailToken('gmail-token');
      // writeFile 첫 번째 인수가 올바른 경로인지 확인
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/mock/gmail-token.enc',
        expect.anything(),
      );

      vi.clearAllMocks();
      mockFs.readFile.mockResolvedValue(Buffer.from('encrypted:gmail-token'));
      await service.getGmailToken();
      expect(mockFs.readFile).toHaveBeenCalledWith('/mock/gmail-token.enc');

      vi.clearAllMocks();
      await service.deleteGmailToken();
      expect(mockFs.unlink).toHaveBeenCalledWith('/mock/gmail-token.enc');
    });

    it('Gmail Client Secret은 /mock/gmail-secret.enc 경로를 사용한다', async () => {
      await service.saveGmailClientSecret('gmail-secret');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/mock/gmail-secret.enc',
        expect.anything(),
      );

      vi.clearAllMocks();
      mockFs.readFile.mockResolvedValue(Buffer.from('encrypted:gmail-secret'));
      await service.getGmailClientSecret();
      expect(mockFs.readFile).toHaveBeenCalledWith('/mock/gmail-secret.enc');

      vi.clearAllMocks();
      await service.deleteGmailClientSecret();
      expect(mockFs.unlink).toHaveBeenCalledWith('/mock/gmail-secret.enc');
    });

    it('Slack 봇 토큰은 /mock/slack-token.enc 경로를 사용한다', async () => {
      await service.saveSlackBotToken('slack-token');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/mock/slack-token.enc',
        expect.anything(),
      );

      vi.clearAllMocks();
      mockFs.readFile.mockResolvedValue(Buffer.from('encrypted:slack-token'));
      await service.getSlackBotToken();
      expect(mockFs.readFile).toHaveBeenCalledWith('/mock/slack-token.enc');

      vi.clearAllMocks();
      await service.deleteSlackBotToken();
      expect(mockFs.unlink).toHaveBeenCalledWith('/mock/slack-token.enc');
    });
  });

  // ─── canUseSafeStorage getter ─────────────────────────────────────────────

  describe('canUseSafeStorage', () => {
    it('isEncryptionAvailable이 throw하면 false를 반환한다', async () => {
      mockSafeStorage.isEncryptionAvailable.mockImplementation(() => {
        throw new Error('not available');
      });

      // saveToken은 canUseSafeStorage=false 경로(base64)로 진행해야 한다
      await service.saveToken('test');
      expect(mockSafeStorage.encryptString).not.toHaveBeenCalled();
      const base64 = Buffer.from('test', 'utf-8').toString('base64');
      expect(mockFs.writeFile).toHaveBeenCalledWith('/mock/token.enc', base64, 'utf-8');
    });
  });
});
