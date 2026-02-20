import { schedule as cronSchedule } from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import type { BrowserWindow } from 'electron';
import type { StorageService } from './storage';
import type { SlackService } from './slack';
import type { SlackSettings } from '../schemas/settings.schema';
import {
  filterIssuesToday,
  groupByAssignee,
  buildDailyReportPrompt,
  buildIssueDataForPrompt,
  formatReportForSlack,
  buildStructuredReport,
  getTodayDateStr,
} from '../utils/daily-report';
import { showTaskNotification } from '../utils/notification';
import { logger } from '../utils/logger';
import { spawnAIProcess } from '../utils/process-spawner';
import { claudeAgent } from './agents/claude';

export class DailyReportScheduler {
  private task: ScheduledTask | null = null;
  private storage: StorageService;
  private slack: SlackService;
  private mainWindow: BrowserWindow | null;
  private running = false;

  constructor(storage: StorageService, slack: SlackService, mainWindow: BrowserWindow | null) {
    this.storage = storage;
    this.slack = slack;
    this.mainWindow = mainWindow;
  }

  start(settings: SlackSettings): void {
    this.stop();

    const hasWebhook = !!settings.webhookUrl;
    const hasThread = settings.replyToThread && !!settings.botToken && !!settings.channelId && !!settings.threadSearchText;

    if (!settings.enabled || (!hasWebhook && !hasThread)) {
      logger.info('Daily report scheduler disabled or no delivery method configured');
      return;
    }

    const [hour, minute] = settings.dailyReportTime.split(':');
    const cronExpression = `${minute} ${hour} * * *`;

    this.task = cronSchedule(cronExpression, async () => {
      logger.info(`Daily report triggered at ${settings.dailyReportTime}`);
      await this.generateAndSendReports(settings);
    });

    logger.info(`Daily report scheduled for ${settings.dailyReportTime} (cron: ${cronExpression})`);
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Daily report scheduler stopped');
    }
  }

  updateWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /** IPC에서 호출 — 설정 로드/검증을 내부에서 처리 */
  async triggerManual(): Promise<{ success: boolean; error?: string }> {
    const settings = await this.storage.loadSettings();
    const hasWebhook = !!settings.slack.webhookUrl;
    const hasThread = settings.slack.replyToThread && !!settings.slack.botToken && !!settings.slack.channelId && !!settings.slack.threadSearchText;
    if (!hasWebhook && !hasThread) {
      return { success: false, error: 'No delivery method configured' };
    }
    return this.generateAndSendReports(settings.slack);
  }

  /** 담당자별 리포트 생성 → 슬랙 전송 (외부에서도 호출 가능 — 테스트용) */
  async generateAndSendReports(slackSettings: SlackSettings): Promise<{ success: boolean; error?: string }> {
    if (this.running) {
      logger.warn('Daily report generation already in progress');
      return { success: false, error: 'Already running' };
    }

    this.running = true;

    try {
      const latestData = await this.storage.getLatest();
      if (!latestData || latestData.issues.length === 0) {
        logger.warn('No issue data available for daily report');
        return { success: false, error: 'No issue data' };
      }

      // 스레드 댓글 모드: 대상 메시지를 미리 찾아둔다
      const useThread = slackSettings.replyToThread && !!slackSettings.botToken && !!slackSettings.channelId && !!slackSettings.threadSearchText;
      let threadTs: string | null = null;

      if (useThread) {
        try {
          const found = await this.slack.findTodayMessage(
            slackSettings.botToken,
            slackSettings.channelId,
            slackSettings.threadSearchText,
          );
          if (found) {
            threadTs = found.ts;
            logger.info(`Thread target found: "${found.text.slice(0, 50)}..." (ts: ${found.ts})`);
          } else {
            logger.warn(`Thread target message not found for search text: "${slackSettings.threadSearchText}"`);
          }
        } catch (error: any) {
          logger.warn(`Failed to find thread target: ${error.message}`);
        }
      }

      let sentCount = 0;

      // 스레드 모드: 전체 이슈에서 진행중 작업 기반 구조화 리포트 (오늘 업데이트 필터 불필요)
      if (useThread && threadTs) {
        const settings = await this.storage.loadSettings();
        const baseUrl = settings.jira.baseUrl;
        const assignees = [...new Set(latestData.issues.map((i) => i.assignee).filter(Boolean))] as string[];

        for (const assignee of assignees) {
          try {
            const structuredMessage = buildStructuredReport(assignee, latestData.issues, baseUrl);

            if (structuredMessage) {
              await this.slack.postThreadReply(
                slackSettings.botToken,
                slackSettings.channelId,
                threadTs,
                structuredMessage,
              );

              sentCount++;
              logger.info(`Structured report sent for ${assignee}`);
            }
          } catch (error: any) {
            logger.warn(`Failed to send structured report for ${assignee}: ${error.message}`);
          }
        }

        if (sentCount === 0) {
          logger.info('No in-progress tasks found for any assignee');
        }
      } else {
        // Webhook 모드: 오늘 업데이트된 이슈만 대상, AI 리포트 생성
        const dateStr = getTodayDateStr();
        const todayIssues = filterIssuesToday(latestData.issues, dateStr);

        if (todayIssues.length === 0) {
          logger.info('No issues updated today, skipping daily report');
          return { success: true };
        }

        const assigneeGroups = groupByAssignee(todayIssues);

        for (const [assignee, issues] of assigneeGroups) {
          try {
            const prompt = buildDailyReportPrompt(assignee, dateStr);
            const issueData = buildIssueDataForPrompt(issues);
            const fullPrompt = `${prompt}\n\n## 이슈 데이터 (JSON)\n\n${issueData}`;

            const reportMarkdown = await this.runAI(fullPrompt);

            if (reportMarkdown) {
              const slackMessage = formatReportForSlack(reportMarkdown, assignee, dateStr);

              if (slackSettings.webhookUrl) {
                await this.slack.send(slackSettings.webhookUrl, slackMessage);
              }

              const filename = `daily-${dateStr}-${assignee}`;
              await this.storage.saveReport(filename, reportMarkdown);

              sentCount++;
              logger.info(`Daily report sent for ${assignee}`);
            }
          } catch (error: any) {
            logger.warn(`Failed to generate/send report for ${assignee}: ${error.message}`);
          }
        }
      }

      showTaskNotification({
        title: '일일 공유 리포트',
        status: 'done',
      });

      logger.info(`Daily reports completed: ${sentCount} sent`);
      return { success: true };
    } catch (error: any) {
      logger.warn(`Daily report generation failed: ${error.message}`);
      showTaskNotification({
        title: '일일 공유 리포트',
        status: 'error',
      });
      return { success: false, error: error.message };
    } finally {
      this.running = false;
    }
  }

  /** AI CLI 실행 후 stdout 전체를 반환 */
  private runAI(prompt: string, timeoutMs = 120_000): Promise<string> {
    return new Promise((resolve, reject) => {
      const { shellCmd } = claudeAgent.buildCommand({});
      const { child } = spawnAIProcess({ shellCmd, prompt });

      const chunks: string[] = [];
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        reject(new Error('AI process timed out'));
      }, timeoutMs);

      child.stdout?.on('data', (chunk: Buffer) => {
        chunks.push(chunk.toString());
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        logger.warn(`Daily report AI stderr: ${chunk.toString()}`);
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (timedOut) return;

        if (code !== 0) {
          reject(new Error(`AI process exited with code ${code}`));
        } else {
          resolve(chunks.join(''));
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }
}
