import { spawn, type ChildProcess } from 'node:child_process';
import type { BrowserWindow } from 'electron';
import { logger } from '../utils/logger';

type AIType = 'claude' | 'gemini';

interface RunningJob {
  process: ChildProcess;
  id: string;
}

export class AIRunnerService {
  private win: BrowserWindow;
  private jobs = new Map<string, RunningJob>();
  private nextId = 0;

  constructor(win: BrowserWindow) {
    this.win = win;
  }

  run(prompt: string, aiType: AIType = 'claude'): string {
    const id = `ai-${++this.nextId}`;

    const shellCmd = aiType === 'claude'
      ? "claude -p --output-format text --no-session-persistence --disallowedTools 'Edit,Write,Bash,NotebookEdit'"
      : 'gemini -p -o text';

    const child = spawn('/bin/zsh', ['-l', '-c', shellCmd], {
      env: { ...process.env } as Record<string, string>,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.jobs.set(id, { process: child, id });

    child.stdin?.write(prompt);
    child.stdin?.end();

    child.stdout?.on('data', (chunk: Buffer) => {
      this.send('ai:chunk', { id, text: chunk.toString() });
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      logger.warn(`AI ${id} stderr: ${chunk.toString()}`);
    });

    child.on('close', (code) => {
      this.jobs.delete(id);
      this.send('ai:done', { id, exitCode: code ?? 0 });
      logger.info(`AI job ${id} (${aiType}) finished with code ${code}`);
    });

    child.on('error', (err) => {
      this.jobs.delete(id);
      this.send('ai:error', { id, message: err.message });
      logger.warn(`AI job ${id} error: ${err.message}`);
    });

    return id;
  }

  abort(id: string): void {
    const job = this.jobs.get(id);
    if (job) {
      job.process.kill('SIGTERM');
      this.jobs.delete(id);
    }
  }

  private send(channel: string, data: unknown): void {
    if (!this.win.isDestroyed()) {
      this.win.webContents.send(channel, data);
    }
  }
}
