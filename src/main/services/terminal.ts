import * as pty from 'node-pty';
import type { BrowserWindow } from 'electron';
import { logger } from '../utils/logger';

type AIType = 'claude' | 'gemini';

interface TerminalSession {
  ptyProcess: pty.IPty;
  id: string;
}

const AI_CONFIG: Record<AIType, { cmd: string; args: string[] }> = {
  claude: {
    cmd: 'claude',
    args: ['--disallowedTools', 'Edit,Write,Bash,NotebookEdit'],
  },
  gemini: {
    cmd: 'gemini',
    args: [],
  },
};

export class TerminalService {
  private sessions = new Map<string, TerminalSession>();
  private nextId = 0;

  create(
    window: BrowserWindow,
    aiType: AIType = 'claude',
    initialPrompt?: string,
    cols = 80,
    rows = 24,
  ): string {
    const id = `terminal-${++this.nextId}`;
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';
    const config = AI_CONFIG[aiType];

    let ptyProcess: pty.IPty;
    try {
      ptyProcess = pty.spawn(config.cmd, config.args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: process.env.HOME || '/',
        env: { ...process.env } as Record<string, string>,
      });
    } catch {
      logger.warn(`${config.cmd} CLI not found, falling back to shell`);
      ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: process.env.HOME || '/',
        env: { ...process.env } as Record<string, string>,
      });
    }

    ptyProcess.onData((data: string) => {
      if (!window.isDestroyed()) {
        window.webContents.send('terminal:data', id, data);
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      if (!window.isDestroyed()) {
        window.webContents.send('terminal:exit', id, exitCode);
      }
      this.sessions.delete(id);
      logger.info(`Terminal session ${id} (${aiType}) exited with code ${exitCode}`);
    });

    this.sessions.set(id, { ptyProcess, id });
    logger.info(`Terminal session ${id} created (${aiType})`);

    if (initialPrompt) {
      setTimeout(() => {
        if (this.sessions.has(id)) {
          ptyProcess.write(initialPrompt + '\n');
        }
      }, 2000);
    }

    return id;
  }

  write(id: string, data: string): void {
    this.sessions.get(id)?.ptyProcess.write(data);
  }

  resize(id: string, cols: number, rows: number): void {
    this.sessions.get(id)?.ptyProcess.resize(cols, rows);
  }

  close(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.ptyProcess.kill();
      this.sessions.delete(id);
      logger.info(`Terminal session ${id} closed`);
    }
  }

  closeAll(): void {
    for (const [id] of this.sessions) {
      this.close(id);
    }
  }
}
