import { spawn, type ChildProcess } from 'node:child_process';

export interface SpawnOptions {
  shellCmd: string;
  prompt: string;
  env?: Record<string, string>;
}

export interface SpawnedProcess {
  child: ChildProcess;
  kill: (signal?: NodeJS.Signals) => void;
}

const DEFAULT_ENV: Record<string, string> = {
  DISABLE_AUTO_UPDATE: 'true',
  DISABLE_UPDATE_PROMPT: 'true',
  ZSH_DISABLE_AUTO_UPDATE: 'true',
};

/**
 * CLI 프로세스를 스폰한다.
 * - /bin/zsh -l -i -c 로 실행
 * - 환경변수 자동 설정 (DISABLE_AUTO_UPDATE 등)
 * - stdin에 prompt를 write 후 end
 * - stdin EPIPE 에러 무시
 */
export function spawnAIProcess(options: SpawnOptions): SpawnedProcess {
  const { shellCmd, prompt, env } = options;

  const child = spawn('/bin/zsh', ['-l', '-i', '-c', shellCmd], {
    env: {
      ...process.env,
      ...DEFAULT_ENV,
      ...env,
    } as Record<string, string>,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  child.stdin?.on('error', (err) => {
    if ((err as NodeJS.ErrnoException).code !== 'EPIPE') {
      // EPIPE는 프로세스가 먼저 종료된 정상 케이스 — 무시
      throw err;
    }
  });

  child.stdin?.write(prompt);
  child.stdin?.end();

  return {
    child,
    kill: (signal: NodeJS.Signals = 'SIGTERM') => child.kill(signal),
  };
}
