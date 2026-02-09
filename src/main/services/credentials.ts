import { safeStorage } from 'electron';
import fs from 'node:fs/promises';
import { getTokenPath } from '../utils/paths';
import { logger } from '../utils/logger';

export class CredentialsService {
  private get canUseSafeStorage(): boolean {
    try {
      return safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  }

  async saveToken(token: string): Promise<void> {
    if (this.canUseSafeStorage) {
      const encrypted = safeStorage.encryptString(token);
      await fs.writeFile(getTokenPath(), encrypted);
      logger.info('API token saved (encrypted via safeStorage)');
    } else {
      // Fallback: base64 encoding (not secure, but functional)
      const encoded = Buffer.from(token, 'utf-8').toString('base64');
      await fs.writeFile(getTokenPath(), encoded, 'utf-8');
      logger.warn('API token saved (base64 fallback — safeStorage unavailable)');
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const data = await fs.readFile(getTokenPath());

      if (this.canUseSafeStorage) {
        try {
          return safeStorage.decryptString(Buffer.from(data));
        } catch {
          // Might be base64 fallback data, try that
          const str = data.toString('utf-8');
          return Buffer.from(str, 'base64').toString('utf-8');
        }
      } else {
        // Try base64 fallback
        const str = data.toString('utf-8');
        return Buffer.from(str, 'base64').toString('utf-8');
      }
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
