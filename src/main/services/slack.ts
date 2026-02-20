import { net } from 'electron';
import { startOfDay, getUnixTime } from 'date-fns';
import { logger } from '../utils/logger';

const SLACK_API_BASE = 'https://slack.com/api';

interface SlackMessage {
  ts: string;
  text: string;
  type: string;
}

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

  /** Bot Token + Channel 유효성 테스트 */
  async testBotToken(
    botToken: string,
    channelId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const data = await this.slackApiGet(botToken, 'conversations.info', {
        channel: channelId,
      });
      if (!data.ok) {
        return { success: false, error: data.error ?? 'Unknown error' };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /** 오늘 메시지 중 검색 텍스트를 포함하는 메시지 찾기 */
  async findTodayMessage(
    botToken: string,
    channelId: string,
    searchText: string,
  ): Promise<{ ts: string; text: string } | null> {
    const todayStart = getUnixTime(startOfDay(new Date()));

    const data = await this.slackApiGet(botToken, 'conversations.history', {
      channel: channelId,
      oldest: String(todayStart),
      limit: '100',
    });

    if (!data.ok) {
      throw new Error(`conversations.history failed: ${data.error}`);
    }

    const messages: SlackMessage[] = data.messages ?? [];
    const found = messages.find((msg) => msg.text?.includes(searchText));

    if (!found) return null;

    return { ts: found.ts, text: found.text };
  }

  /** 특정 메시지의 스레드에 댓글 전송 */
  async postThreadReply(
    botToken: string,
    channelId: string,
    threadTs: string,
    text: string,
  ): Promise<void> {
    const data = await this.slackApiPost(botToken, 'chat.postMessage', {
      channel: channelId,
      thread_ts: threadTs,
      text,
    });

    if (!data.ok) {
      throw new Error(`chat.postMessage failed: ${data.error}`);
    }

    logger.info('Slack thread reply sent successfully');
  }

  /** 특정 사용자에게 DM 전송 (chat.postMessage에 userId를 channel로 전달) */
  async sendDM(botToken: string, userId: string, text: string): Promise<void> {
    const data = await this.slackApiPost(botToken, 'chat.postMessage', {
      channel: userId,
      text,
    });

    if (!data.ok) {
      throw new Error(`chat.postMessage (DM) failed: ${data.error}`);
    }

    logger.info(`Slack DM sent to ${userId}`);
  }

  /** DM 전송 테스트 */
  async testDM(
    botToken: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.sendDM(botToken, userId, '🔔 Client Jira DM 연동 테스트 메시지입니다.');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /** Slack Web API GET 호출 */
  private async slackApiGet(
    token: string,
    method: string,
    params: Record<string, string>,
  ): Promise<any> {
    const url = new URL(`${SLACK_API_BASE}/${method}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await net.fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Slack API ${method} HTTP ${response.status}`);
    }

    return response.json();
  }

  /** Slack Web API POST 호출 */
  private async slackApiPost(
    token: string,
    method: string,
    body: Record<string, string>,
  ): Promise<any> {
    const response = await net.fetch(`${SLACK_API_BASE}/${method}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Slack API ${method} HTTP ${response.status}`);
    }

    return response.json();
  }
}
