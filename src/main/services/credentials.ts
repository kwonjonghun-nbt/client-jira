import { safeStorage } from 'electron';
import fs from 'node:fs/promises';
import { getTokenPath, getGmailTokenPath, getGmailClientSecretPath, getSlackBotTokenPath } from './paths';
import { logger } from '../utils/logger';

export class CredentialsService {
  private get canUseSafeStorage(): boolean {
    try {
      return safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  }

  // ─── Generic encrypted storage helpers ──────────────────────────────────────

  private async saveEncrypted(filePath: string, value: string, label: string): Promise<void> {
    if (this.canUseSafeStorage) {
      const encrypted = safeStorage.encryptString(value);
      await fs.writeFile(filePath, encrypted);
      logger.info(`${label} saved (encrypted via safeStorage)`);
    } else {
      const encoded = Buffer.from(value, 'utf-8').toString('base64');
      await fs.writeFile(filePath, encoded, 'utf-8');
      logger.warn(`${label} saved (base64 fallback — safeStorage unavailable)`);
    }
  }

  private async readEncrypted(filePath: string): Promise<string | null> {
    try {
      const data = await fs.readFile(filePath);
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

  private async deleteEncrypted(filePath: string, label: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      logger.info(`${label} deleted`);
    } catch {
      // File doesn't exist, ignore
    }
  }

  // ─── API Token ──────────────────────────────────────────────────────────────

  async saveToken(token: string): Promise<void> {
    return this.saveEncrypted(getTokenPath(), token, 'API token');
  }

  async getToken(): Promise<string | null> {
    return this.readEncrypted(getTokenPath());
  }

  async deleteToken(): Promise<void> {
    return this.deleteEncrypted(getTokenPath(), 'API token');
  }

  async hasToken(): Promise<boolean> {
    try {
      await fs.access(getTokenPath());
      return true;
    } catch {
      return false;
    }
  }

  // ─── Gmail OAuth Token ──────────────────────────────────────────────────────

  async saveGmailToken(token: string): Promise<void> {
    return this.saveEncrypted(getGmailTokenPath(), token, 'Gmail OAuth token');
  }

  async getGmailToken(): Promise<string | null> {
    return this.readEncrypted(getGmailTokenPath());
  }

  async deleteGmailToken(): Promise<void> {
    return this.deleteEncrypted(getGmailTokenPath(), 'Gmail OAuth token');
  }

  // ─── Gmail Client Secret ────────────────────────────────────────────────────

  async saveGmailClientSecret(secret: string): Promise<void> {
    return this.saveEncrypted(getGmailClientSecretPath(), secret, 'Gmail client secret');
  }

  async getGmailClientSecret(): Promise<string | null> {
    return this.readEncrypted(getGmailClientSecretPath());
  }

  async deleteGmailClientSecret(): Promise<void> {
    return this.deleteEncrypted(getGmailClientSecretPath(), 'Gmail client secret');
  }

  // ─── Slack Bot Token ────────────────────────────────────────────────────────

  async saveSlackBotToken(token: string): Promise<void> {
    return this.saveEncrypted(getSlackBotTokenPath(), token, 'Slack bot token');
  }

  async getSlackBotToken(): Promise<string | null> {
    return this.readEncrypted(getSlackBotTokenPath());
  }

  async deleteSlackBotToken(): Promise<void> {
    return this.deleteEncrypted(getSlackBotTokenPath(), 'Slack bot token');
  }
}
