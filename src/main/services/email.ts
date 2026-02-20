import http from 'node:http';
import { google } from 'googleapis';
import { BrowserWindow, shell } from 'electron';
import type { CredentialsService } from './credentials';
import { buildRawEmail } from '../utils/email';
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
        // 로컬 HTTP 서버를 랜덤 포트에 띄워 redirect 수신
        server = http.createServer((req, res) => {
          const url = new URL(req.url ?? '', `http://localhost`);
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          // 성공/실패 응답 HTML
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

          const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
          const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent',
          });

          // 시스템 브라우저로 OAuth 페이지 오픈
          shell.openExternal(authUrl);
        });

        // 타임아웃: 3분 안에 인증하지 않으면 실패
        setTimeout(() => {
          reject(new Error('인증 시간이 초과되었습니다. 다시 시도해주세요.'));
        }, 180_000);
      });

      // code → tokens 교환
      const redirectUri = `http://127.0.0.1:${port}`;
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      const { tokens } = await oauth2Client.getToken(code);
      if (!tokens.refresh_token) {
        return { success: false, error: 'refresh_token을 받지 못했습니다. 다시 시도해주세요.' };
      }

      // refresh_token 저장
      await this.credentials.saveGmailToken(tokens.refresh_token);

      // 사용자 이메일 가져오기
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
      // redirect URI는 토큰 갱신에는 사용되지 않으므로 placeholder
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://127.0.0.1');
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      // 토큰 갱신 시도로 유효성 검증
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

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://127.0.0.1');
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
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

      // 토큰 만료/취소 시 재인증 유도
      if (error.code === 401 || error.code === 403) {
        return { success: false, error: '인증이 만료되었습니다. 설정에서 Google 계정을 다시 연결해주세요.' };
      }
      return { success: false, error: message };
    }
  }

  private async fetchUserEmail(oauth2Client: InstanceType<typeof google.auth.OAuth2>): Promise<string> {
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    return data.email ?? '';
  }
}
