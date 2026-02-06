import { safeStorage } from 'electron';
import fs from 'node:fs/promises';
import { getTokenPath } from '../utils/paths';
import { logger } from '../utils/logger';

export class CredentialsService {
  async saveToken(token: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('시스템 암호화를 사용할 수 없습니다');
    }

    const encrypted = safeStorage.encryptString(token);
    await fs.writeFile(getTokenPath(), encrypted);
    logger.info('API token saved (encrypted)');
  }

  async getToken(): Promise<string | null> {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        return null;
      }
      const encrypted = await fs.readFile(getTokenPath());
      return safeStorage.decryptString(Buffer.from(encrypted));
    } catch {
      return null;
    }
  }

  async deleteToken(): Promise<void> {
    try {
      await fs.unlink(getTokenPath());
      logger.info('API token deleted');
    } catch {
      // Token doesn't exist, ignore
    }
  }

  async hasToken(): Promise<boolean> {
    try {
      await fs.access(getTokenPath());
      return true;
    } catch {
      return false;
    }
  }
}
