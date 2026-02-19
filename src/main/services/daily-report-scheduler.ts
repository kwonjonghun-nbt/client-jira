import { schedule as cronSchedule } from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { spawn } from 'node:child_process';
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
  getTodayDateStr,
} from '../utils/daily-report';
import { showTaskNotification } from '../utils/notification';
import { logger } from '../utils/logger';

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

    if (!settings.enabled || !settings.webhookUrl) {
      logger.info('Daily report scheduler disabled or no webhook URL');
      return;
    }

    const [hour, minute] = settings.dailyReportTime.split(':');
    const cronExpression = `${minute} ${hour} * * *`;

    this.task = cronSchedule(cronExpression, async () => {
      logger.info(`Daily report triggered at ${settings.dailyReportTime}`);
      await this.generateAndSendReports(settings.webhookUrl);
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

  /** 담당자별 리포트 생성 → 슬랙 전송 (외부에서도 호출 가능 — 테스트용) */
  async generateAndSendReports(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
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

      const dateStr = getTodayDateStr();
      const todayIssues = filterIssuesToday(latestData.issues, dateStr);

      if (todayIssues.length === 0) {
        logger.info('No issues updated today, skipping daily report');
        return { success: true };
      }

      const assigneeGroups = groupByAssignee(todayIssues);
      let sentCount = 0;

      for (const [assignee, issues] of assigneeGroups) {
        try {
          const prompt = buildDailyReportPrompt(assignee, dateStr);
          const issueData = buildIssueDataForPrompt(issues);
          const fullPrompt = `${prompt}\n\n## 이슈 데이터 (JSON)\n\n${issueData}`;

          const reportMarkdown = await this.runAI(fullPrompt);

          if (reportMarkdown) {
            const slackMessage = formatReportForSlack(reportMarkdown, assignee, dateStr);
            await this.slack.send(webhookUrl, slackMessage);

            const filename = `daily-${dateStr}-${assignee}`;
            await this.storage.saveReport(filename, reportMarkdown);

            sentCount++;
            logger.info(`Daily report sent for ${assignee}`);
          }
        } catch (error: any) {
          logger.warn(`Failed to generate/send report for ${assignee}: ${error.message}`);
        }
      }

      showTaskNotification({
        title: '일일 공유 리포트',
        status: 'done',
      });

      logger.info(`Daily reports completed: ${sentCount}/${assigneeGroups.size} sent`);
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
      const shellCmd =
        "claude -p --output-format text --no-session-persistence --disallowedTools 'Edit,Write,Bash,NotebookEdit'";

      const child = spawn('/bin/zsh', ['-l', '-i', '-c', shellCmd], {
        env: {
          ...process.env,
          DISABLE_AUTO_UPDATE: 'true',
          DISABLE_UPDATE_PROMPT: 'true',
          ZSH_DISABLE_AUTO_UPDATE: 'true',
        } as Record<string, string>,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const chunks: string[] = [];
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        reject(new Error('AI process timed out'));
      }, timeoutMs);

      child.stdin?.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code !== 'EPIPE') {
          logger.warn(`Daily report AI stdin error: ${err.message}`);
        }
      });

      child.stdin?.write(prompt);
      child.stdin?.end();

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
