import http from 'node:http';
import { OAuth2Client } from 'google-auth-library';
import { gmail_v1 } from '@googleapis/gmail';
import { shell } from 'electron';
import type { CredentialsService } from './credentials';
import type { StorageService } from './storage';
import { buildRawEmail, buildReportEmailSubject, buildReportEmailHtml } from '../utils/email';
import { logger } from '../utils/logger';

const SCOPES = ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/userinfo.email'];

export class EmailService {
  constructor(private credentials: CredentialsService) {}

  /** OAuth 인증 시작 — 로컬 HTTP 서버로 authorization code 수신 */
  async startAuth(
    clientId: string,
    clientSecret: string,
  ): Promise<{ success: boolean; email?: string; error?: string }> {
    let server: http.Server | null = null;

    try {
      const { code, port } = await new Promise<{ code: string; port: number }>((resolve, reject) => {
        server = http.createServer((req, res) => {
          const url = new URL(req.url ?? '', `http://localhost`);
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          if (error) {
            res.end('<html><body><h2>인증 실패</h2><p>창을 닫아주세요.</p></body></html>');
            reject(new Error(`Google 인증 거부: ${error}`));
          } else if (code) {
            res.end('<html><body><h2>인증 완료</h2><p>이 창을 닫고 앱으로 돌아가주세요.</p></body></html>');
            resolve({ code, port: (server!.address() as { port: number }).port });
          } else {
            res.end('<html><body><p>잘못된 요청입니다.</p></body></html>');
          }
        });

        server.listen(0, '127.0.0.1', () => {
          const addr = server!.address() as { port: number };
          const redirectUri = `http://127.0.0.1:${addr.port}`;

          const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
          const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent',
          });

          shell.openExternal(authUrl);
        });

        setTimeout(() => {
          reject(new Error('인증 시간이 초과되었습니다. 다시 시도해주세요.'));
        }, 180_000);
      });

      const redirectUri = `http://127.0.0.1:${port}`;
      const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
      const { tokens } = await oauth2Client.getToken(code);
      if (!tokens.refresh_token) {
        return { success: false, error: 'refresh_token을 받지 못했습니다. 다시 시도해주세요.' };
      }

      await this.credentials.saveGmailToken(tokens.refresh_token);

      oauth2Client.setCredentials(tokens);
      const email = await this.fetchUserEmail(oauth2Client);

      logger.info(`Gmail OAuth connected: ${email}`);
      return { success: true, email };
    } catch (error: any) {
      logger.warn(`Gmail OAuth failed: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      if (server) {
        (server as http.Server).close();
      }
    }
  }

  /** 인증 상태 확인 */
  async getAuthStatus(
    clientId: string,
    clientSecret: string,
  ): Promise<{ authenticated: boolean; email?: string }> {
    const refreshToken = await this.credentials.getGmailToken();
    if (!refreshToken) return { authenticated: false };

    try {
      const oauth2Client = new OAuth2Client(clientId, clientSecret, 'http://127.0.0.1');
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      await oauth2Client.getAccessToken();
      const email = await this.fetchUserEmail(oauth2Client);
      return { authenticated: true, email };
    } catch {
      return { authenticated: false };
    }
  }

  /** 연결 해제 */
  async disconnect(): Promise<void> {
    await this.credentials.deleteGmailToken();
    logger.info('Gmail OAuth disconnected');
  }

  /** Gmail API로 이메일 전송 */
  async sendReport(
    clientId: string,
    clientSecret: string,
    params: { from: string; to: string[]; subject: string; html: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const refreshToken = await this.credentials.getGmailToken();
      if (!refreshToken) {
        return { success: false, error: 'Gmail 인증이 필요합니다. 설정에서 Google 계정을 연결해주세요.' };
      }

      const oauth2Client = new OAuth2Client(clientId, clientSecret, 'http://127.0.0.1');
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      const gmail = new gmail_v1.Gmail({ auth: oauth2Client });
      const raw = buildRawEmail(params);

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });

      logger.info(`Report email sent via Gmail API to ${params.to.join(', ')}`);
      return { success: true };
    } catch (error: any) {
      const message = error.message || '이메일 전송에 실패했습니다.';
      logger.warn(`Gmail API send failed: ${message}`);

      if (error.code === 401 || error.code === 403) {
        return { success: false, error: '인증이 만료되었습니다. 설정에서 Google 계정을 다시 연결해주세요.' };
      }
      return { success: false, error: message };
    }
  }

  /** IPC에서 호출 — 리포트 로드→설정 검증→HTML 빌드→전송을 일괄 처리 */
  async sendReportEmail(
    storage: StorageService,
    params: { to: string[]; reportFilename: string; assignee: string; startDate: string; endDate: string },
  ): Promise<{ success: boolean; error?: string }> {
    const markdown = await storage.getReport(params.reportFilename);
    if (!markdown) {
      return { success: false, error: '리포트를 찾을 수 없습니다.' };
    }

    const settings = await storage.loadSettings();
    const emailSettings = settings.email;
    if (!emailSettings.enabled) {
      return { success: false, error: '이메일 기능이 비활성화되어 있습니다.' };
    }

    // clientSecret은 CredentialsService에서 가져옴
    const clientSecret = await this.credentials.getGmailClientSecret();
    if (!emailSettings.clientId || !clientSecret) {
      return { success: false, error: 'OAuth Client ID/Secret이 설정되지 않았습니다.' };
    }

    const subject = buildReportEmailSubject(params.assignee, params.startDate, params.endDate);
    const html = buildReportEmailHtml(markdown);

    return this.sendReport(emailSettings.clientId, clientSecret, {
      from: emailSettings.senderEmail,
      to: params.to,
      subject,
      html,
    });
  }

  private async fetchUserEmail(oauth2Client: OAuth2Client): Promise<string> {
    const { token } = await oauth2Client.getAccessToken();
    if (!token) return '';
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return '';
    const data = await res.json() as { email?: string };
    return data.email ?? '';
  }
}
