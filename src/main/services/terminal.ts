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

    // Spawn an interactive login shell so ~/.zshrc (PATH, nvm, volta, etc.) is loaded.
    // Then send the CLI command via write() after shell is ready.
    // Using -c flag skips .zshrc in non-interactive mode, so we avoid it.
    const cliCommand = [config.cmd, ...config.args.map(a => `'${a}'`)].join(' ');
    const shellArgs = process.platform === 'win32'
      ? []
      : ['-l', '-i'];

    const ptyProcess = pty.spawn(shell, shellArgs, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: process.env.HOME || '/',
      env: {
        ...process.env,
        DISABLE_AUTO_UPDATE: 'true',        // oh-my-zsh v1 style
        DISABLE_UPDATE_PROMPT: 'true',       // oh-my-zsh v1 style
        ZSH_DISABLE_AUTO_UPDATE: 'true',     // oh-my-zsh v2 style (omz update mode)
      } as Record<string, string>,
    });

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
    logger.info(`Terminal session ${id} created (${aiType}) via interactive login shell`);

    // Detect shell readiness by watching for prompt characters (➜, $, %, #)
    // then send the CLI command. This avoids oh-my-zsh update prompts eating input.
    let commandSent = false;
    const readyListener = ptyProcess.onData((data: string) => {
      if (commandSent) return;
      // Look for common shell prompt endings that indicate shell is ready
      // Strip ANSI escape codes for reliable matching
      const clean = data.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
      const hasPrompt = /[➜$%#>]\s*$/.test(clean);
      if (hasPrompt) {
        commandSent = true;
        readyListener.dispose();
        // Small delay to ensure prompt is fully rendered
        setTimeout(() => {
          if (this.sessions.has(id)) {
            ptyProcess.write(cliCommand + '\n');
          }
        }, 200);

        if (initialPrompt) {
          setTimeout(() => {
            if (this.sessions.has(id)) {
              ptyProcess.write(initialPrompt + '\n');
            }
          }, 2000);
        }
      }
    });

    // Fallback: if prompt not detected within 5s, send anyway
    setTimeout(() => {
      if (!commandSent && this.sessions.has(id)) {
        commandSent = true;
        readyListener.dispose();
        ptyProcess.write(cliCommand + '\n');
        logger.warn(`Terminal ${id}: prompt not detected, sending command after timeout`);
      }
    }, 5000);

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
