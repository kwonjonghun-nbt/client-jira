import { ipcMain } from 'electron';
import type { AppServices } from '../services/types';
import { buildReportEmailSubject, buildReportEmailHtml } from '../utils/email';

export function registerEmailHandlers(services: AppServices): void {
  ipcMain.handle('email:start-auth', async (_event, clientId: string, clientSecret: string) => {
    if (!services.email) throw new Error('Email service not available');
    return services.email.startAuth(clientId, clientSecret);
  });

  ipcMain.handle('email:get-auth-status', async (_event, clientId: string, clientSecret: string) => {
    if (!services.email) throw new Error('Email service not available');
    return services.email.getAuthStatus(clientId, clientSecret);
  });

  ipcMain.handle('email:disconnect', async () => {
    if (!services.email) throw new Error('Email service not available');
    await services.email.disconnect();
    return { success: true };
  });

  ipcMain.handle(
    'email:send-report',
    async (
      _event,
      params: {
        to: string[];
        reportFilename: string;
        assignee: string;
        startDate: string;
        endDate: string;
      },
    ) => {
      if (!services.email) throw new Error('Email service not available');
      if (!services.storage) throw new Error('Storage service not available');

      // 1. 리포트 마크다운 가져오기
      const markdown = await services.storage.getReport(params.reportFilename);
      if (!markdown) {
        return { success: false, error: '리포트를 찾을 수 없습니다.' };
      }

      // 2. 이메일 설정 로드
      const settings = await services.storage.loadSettings();
      const emailSettings = settings.email;
      if (!emailSettings.enabled) {
        return { success: false, error: '이메일 기능이 비활성화되어 있습니다.' };
      }

      if (!emailSettings.clientId || !emailSettings.clientSecret) {
        return { success: false, error: 'OAuth Client ID/Secret이 설정되지 않았습니다.' };
      }

      // 3. 제목과 HTML 본문 생성
      const subject = buildReportEmailSubject(params.assignee, params.startDate, params.endDate);
      const html = buildReportEmailHtml(markdown);

      // 4. Gmail API로 전송
      return services.email.sendReport(
        emailSettings.clientId,
        emailSettings.clientSecret,
        {
          from: emailSettings.senderEmail,
          to: params.to,
          subject,
          html,
        },
      );
    },
  );
}
