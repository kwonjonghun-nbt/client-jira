import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockStdin = { on: vi.fn(), write: vi.fn(), end: vi.fn() };
const mockChild = { stdin: mockStdin, stdout: {}, stderr: {}, kill: vi.fn() };

vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => mockChild),
}));

import { spawn } from 'node:child_process';
import { spawnAIProcess } from '../src/main/utils/process-spawner';

const mockedSpawn = vi.mocked(spawn);

describe('spawnAIProcess', () => {
  const originalShell = process.env.SHELL;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStdin.on.mockReset();
    mockStdin.write.mockReset();
    mockStdin.end.mockReset();
    mockChild.kill.mockReset();
  });

  afterEach(() => {
    if (originalShell === undefined) {
      delete process.env.SHELL;
    } else {
      process.env.SHELL = originalShell;
    }
  });

  it('spawn을 올바른 인자로 호출한다 (shell, args, env, stdio)', () => {
    process.env.SHELL = '/bin/zsh';

    spawnAIProcess({ shellCmd: 'claude', prompt: 'hello' });

    expect(mockedSpawn).toHaveBeenCalledWith(
      '/bin/zsh',
      ['-l', '-c', 'claude'],
      expect.objectContaining({
        stdio: ['pipe', 'pipe', 'pipe'],
      }),
    );
  });

  it('환경변수에 DEFAULT_ENV가 포함된다', () => {
    process.env.SHELL = '/bin/bash';

    spawnAIProcess({ shellCmd: 'claude', prompt: 'test' });

    const callEnv = mockedSpawn.mock.calls[0][2]?.env as Record<string, string>;
    expect(callEnv['DISABLE_AUTO_UPDATE']).toBe('true');
    expect(callEnv['DISABLE_UPDATE_PROMPT']).toBe('true');
    expect(callEnv['ZSH_DISABLE_AUTO_UPDATE']).toBe('true');
  });

  it('사용자 정의 env가 DEFAULT_ENV를 오버라이드한다', () => {
    process.env.SHELL = '/bin/bash';

    spawnAIProcess({
      shellCmd: 'claude',
      prompt: 'test',
      env: { DISABLE_AUTO_UPDATE: 'false', MY_CUSTOM_VAR: 'custom' },
    });

    const callEnv = mockedSpawn.mock.calls[0][2]?.env as Record<string, string>;
    expect(callEnv['DISABLE_AUTO_UPDATE']).toBe('false');
    expect(callEnv['MY_CUSTOM_VAR']).toBe('custom');
  });

  it('process.env.SHELL이 없으면 /bin/sh를 사용한다', () => {
    delete process.env.SHELL;

    spawnAIProcess({ shellCmd: 'claude', prompt: 'hello' });

    expect(mockedSpawn).toHaveBeenCalledWith('/bin/sh', ['-l', '-c', 'claude'], expect.anything());
  });

  it('process.env.SHELL이 있으면 해당 셸을 사용한다', () => {
    process.env.SHELL = '/usr/local/bin/fish';

    spawnAIProcess({ shellCmd: 'claude', prompt: 'hello' });

    expect(mockedSpawn).toHaveBeenCalledWith(
      '/usr/local/bin/fish',
      ['-l', '-c', 'claude'],
      expect.anything(),
    );
  });

  it('stdin에 prompt를 write하고 end한다', () => {
    process.env.SHELL = '/bin/zsh';

    spawnAIProcess({ shellCmd: 'claude', prompt: 'my prompt text' });

    expect(mockStdin.write).toHaveBeenCalledWith('my prompt text');
    expect(mockStdin.end).toHaveBeenCalledTimes(1);
  });

  it('stdin EPIPE 에러는 무시한다', () => {
    process.env.SHELL = '/bin/zsh';

    spawnAIProcess({ shellCmd: 'claude', prompt: 'hello' });

    const onErrorHandler = mockStdin.on.mock.calls.find(([event]) => event === 'error')?.[1] as
      | ((err: NodeJS.ErrnoException) => void)
      | undefined;

    expect(onErrorHandler).toBeDefined();

    const epipeError = Object.assign(new Error('EPIPE'), { code: 'EPIPE' });
    expect(() => onErrorHandler!(epipeError)).not.toThrow();
  });

  it('EPIPE가 아닌 stdin 에러는 throw한다', () => {
    process.env.SHELL = '/bin/zsh';

    spawnAIProcess({ shellCmd: 'claude', prompt: 'hello' });

    const onErrorHandler = mockStdin.on.mock.calls.find(([event]) => event === 'error')?.[1] as
      | ((err: NodeJS.ErrnoException) => void)
      | undefined;

    expect(onErrorHandler).toBeDefined();

    const otherError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    expect(() => onErrorHandler!(otherError)).toThrow('ENOENT');
  });

  it('kill 함수가 기본 SIGTERM으로 프로세스를 종료한다', () => {
    process.env.SHELL = '/bin/zsh';

    const { kill } = spawnAIProcess({ shellCmd: 'claude', prompt: 'hello' });
    kill();

    expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('kill 함수에 커스텀 시그널을 전달할 수 있다', () => {
    process.env.SHELL = '/bin/zsh';

    const { kill } = spawnAIProcess({ shellCmd: 'claude', prompt: 'hello' });
    kill('SIGKILL');

    expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
  });
});
