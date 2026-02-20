import type { ChildProcess } from 'node:child_process';
import type { BrowserWindow } from 'electron';
import { logger } from '../utils/logger';
import { spawnAIProcess } from '../utils/process-spawner';
import { claudeAgent } from './agents/claude';
import { geminiAgent } from './agents/gemini';
import type { AIType } from './agents/types';

const DEFAULT_TIMEOUT_MS = 10 * 60_000; // 10분

interface RunningJobEntry {
  process: ChildProcess;
  id: string;
  timer: ReturnType<typeof setTimeout>;
}

export class AIRunnerService {
  private win: BrowserWindow;
  private jobs = new Map<string, RunningJobEntry>();
  private nextId = 0;

  constructor(win: BrowserWindow) {
    this.win = win;
  }

  updateWindow(win: BrowserWindow): void {
    this.win = win;
  }

  run(prompt: string, aiType: AIType = 'claude', model?: string, timeoutMs = DEFAULT_TIMEOUT_MS): string {
    const id = `ai-${++this.nextId}`;

    const agent = aiType === 'claude' ? claudeAgent : geminiAgent;
    const { shellCmd } = agent.buildCommand({ model });
    const { child } = spawnAIProcess({ shellCmd, prompt });

    const killOnTimeout = () => {
      if (this.jobs.has(id)) {
        logger.warn(`AI job ${id} (${aiType}) timed out (no output for ${timeoutMs / 1000}s)`);
        this.jobs.delete(id);
        child.kill('SIGTERM');
        this.send('ai:error', { id, message: `No output for ${timeoutMs / 1000}s — process killed` });
      }
    };

    const resetTimer = () => {
      const entry = this.jobs.get(id);
      if (!entry) return;
      clearTimeout(entry.timer);
      entry.timer = setTimeout(killOnTimeout, timeoutMs);
    };

    const timer = setTimeout(killOnTimeout, timeoutMs);
    this.jobs.set(id, { process: child, id, timer });

    child.stdout?.on('data', (chunk: Buffer) => {
      resetTimer();
      this.send('ai:chunk', { id, text: chunk.toString() });
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      logger.warn(`AI ${id} stderr: ${chunk.toString()}`);
    });

    child.on('close', (code) => {
      const entry = this.jobs.get(id);
      if (!entry) return; // already handled (timeout or abort)
      clearTimeout(entry.timer);
      this.jobs.delete(id);

      const exitCode = code ?? 0;
      if (exitCode !== 0) {
        this.send('ai:error', { id, message: `Process exited with code ${exitCode}` });
        logger.warn(`AI job ${id} (${aiType}) failed with code ${exitCode}`);
      } else {
        this.send('ai:done', { id, exitCode });
        logger.info(`AI job ${id} (${aiType}) finished with code ${exitCode}`);
      }
    });

    child.on('error', (err) => {
      const entry = this.jobs.get(id);
      if (entry) clearTimeout(entry.timer);
      this.jobs.delete(id);
      this.send('ai:error', { id, message: err.message });
      logger.warn(`AI job ${id} error: ${err.message}`);
    });

    return id;
  }

  abort(id: string): void {
    const entry = this.jobs.get(id);
    if (entry) {
      clearTimeout(entry.timer);
      this.jobs.delete(id);
      entry.process.stdin?.destroy();
      entry.process.kill('SIGTERM');
    }
  }

  /** 앱 종료 시 모든 실행 중인 job 정리 */
  destroyAll(): void {
    for (const [id, entry] of this.jobs) {
      clearTimeout(entry.timer);
      entry.process.kill('SIGTERM');
      logger.info(`AI job ${id} killed on shutdown`);
    }
    this.jobs.clear();
  }

  private send(channel: string, data: unknown): void {
    if (!this.win.isDestroyed()) {
      this.win.webContents.send(channel, data);
    }
  }
}
