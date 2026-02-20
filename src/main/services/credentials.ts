import { safeStorage } from 'electron';
import fs from 'node:fs/promises';
import { getTokenPath, getGmailTokenPath, getGmailClientSecretPath, getSlackBotTokenPath } from '../utils/paths';
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

  async saveGmailToken(token: string): Promise<void> {
    if (this.canUseSafeStorage) {
      const encrypted = safeStorage.encryptString(token);
      await fs.writeFile(getGmailTokenPath(), encrypted);
      logger.info('Gmail OAuth token saved (encrypted via safeStorage)');
    } else {
      const encoded = Buffer.from(token, 'utf-8').toString('base64');
      await fs.writeFile(getGmailTokenPath(), encoded, 'utf-8');
      logger.warn('Gmail OAuth token saved (base64 fallback — safeStorage unavailable)');
    }
  }

  async getGmailToken(): Promise<string | null> {
    try {
      const data = await fs.readFile(getGmailTokenPath());
      if (this.canUseSafeStorage) {
        try {
          return safeStorage.decryptString(Buffer.from(data));
        } catch {
          const str = data.toString('utf-8');
          return Buffer.from(str, 'base64').toString('utf-8');
        }
      } else {
        const str = data.toString('utf-8');
        return Buffer.from(str, 'base64').toString('utf-8');
      }
    } catch {
      return null;
    }
  }

  async deleteGmailToken(): Promise<void> {
    try {
      await fs.unlink(getGmailTokenPath());
      logger.info('Gmail OAuth token deleted');
    } catch {
      // Token doesn't exist, ignore
    }
  }

  async saveGmailClientSecret(secret: string): Promise<void> {
    if (this.canUseSafeStorage) {
      const encrypted = safeStorage.encryptString(secret);
      await fs.writeFile(getGmailClientSecretPath(), encrypted);
      logger.info('Gmail client secret saved (encrypted via safeStorage)');
    } else {
      const encoded = Buffer.from(secret, 'utf-8').toString('base64');
      await fs.writeFile(getGmailClientSecretPath(), encoded, 'utf-8');
      logger.warn('Gmail client secret saved (base64 fallback — safeStorage unavailable)');
    }
  }

  async getGmailClientSecret(): Promise<string | null> {
    try {
      const data = await fs.readFile(getGmailClientSecretPath());
      if (this.canUseSafeStorage) {
        try {
          return safeStorage.decryptString(Buffer.from(data));
        } catch {
          const str = data.toString('utf-8');
          return Buffer.from(str, 'base64').toString('utf-8');
        }
      } else {
        const str = data.toString('utf-8');
        return Buffer.from(str, 'base64').toString('utf-8');
      }
    } catch {
      return null;
    }
  }

  async deleteGmailClientSecret(): Promise<void> {
    try {
      await fs.unlink(getGmailClientSecretPath());
      logger.info('Gmail client secret deleted');
    } catch {
      // Secret doesn't exist, ignore
    }
  }

  async saveSlackBotToken(token: string): Promise<void> {
    if (this.canUseSafeStorage) {
      const encrypted = safeStorage.encryptString(token);
      await fs.writeFile(getSlackBotTokenPath(), encrypted);
      logger.info('Slack bot token saved (encrypted via safeStorage)');
    } else {
      const encoded = Buffer.from(token, 'utf-8').toString('base64');
      await fs.writeFile(getSlackBotTokenPath(), encoded, 'utf-8');
      logger.warn('Slack bot token saved (base64 fallback — safeStorage unavailable)');
    }
  }

  async getSlackBotToken(): Promise<string | null> {
    try {
      const data = await fs.readFile(getSlackBotTokenPath());
      if (this.canUseSafeStorage) {
        try {
          return safeStorage.decryptString(Buffer.from(data));
        } catch {
          const str = data.toString('utf-8');
          return Buffer.from(str, 'base64').toString('utf-8');
        }
      } else {
        const str = data.toString('utf-8');
        return Buffer.from(str, 'base64').toString('utf-8');
      }
    } catch {
      return null;
    }
  }

  async deleteSlackBotToken(): Promise<void> {
    try {
      await fs.unlink(getSlackBotTokenPath());
      logger.info('Slack bot token deleted');
    } catch {
      // Token doesn't exist, ignore
    }
  }
}
