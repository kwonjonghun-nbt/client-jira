import { net } from 'electron';
import { logger } from '../utils/logger';

export class SlackService {
  /** 슬랙 웹훅으로 메시지 전송 */
  async send(webhookUrl: string, text: string): Promise<void> {
    const body = JSON.stringify({ text });

    const response = await net.fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(`Slack webhook failed: ${response.status} ${errorText}`);
      throw new Error(`Slack webhook failed: ${response.status} ${errorText}`);
    }

    logger.info('Slack message sent successfully');
  }

  /** 웹훅 URL 유효성 테스트 (간단한 메시지 전송) */
  async testWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.send(webhookUrl, '🔔 Client Jira 슬랙 연동 테스트 메시지입니다.');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
