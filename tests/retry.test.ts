import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retry } from '../src/main/utils/retry';

vi.mock('../src/main/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

/** HTTP 응답 에러 객체를 생성한다 */
function makeHttpError(status: number, data?: unknown): Error & { response: { status: number; data?: unknown } } {
  const err = new Error(`HTTP ${status}`) as Error & { response: { status: number; data?: unknown } };
  err.response = { status, data };
  return err;
}

describe('retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('첫 시도에 성공하면 결과를 반환한다', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await retry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('N회 실패 후 성공하면 결과를 반환한다', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const promise = retry(fn, 3, 100);
    await vi.advanceTimersByTimeAsync(100); // attempt 0 delay
    await vi.advanceTimersByTimeAsync(200); // attempt 1 delay
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('최대 재시도 횟수를 소진하면 마지막 에러를 throw한다', async () => {
    const lastError = new Error('persistent failure');
    const fn = vi.fn().mockRejectedValue(lastError);

    let caught: unknown;
    const promise = retry(fn, 3, 100).catch((e) => { caught = e; });
    await vi.advanceTimersByTimeAsync(100); // attempt 0 delay
    await vi.advanceTimersByTimeAsync(200); // attempt 1 delay
    await promise;

    expect(caught).toBe(lastError);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('지수 백오프 딜레이를 적용한다 (baseDelay * 2^attempt)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const baseDelay = 500;
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const promise = retry(fn, 3, baseDelay).catch(() => {});
    // attempt 0 → delay 500ms
    await vi.advanceTimersByTimeAsync(500);
    // attempt 1 → delay 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    await promise;

    const delays = setTimeoutSpy.mock.calls.map((call) => call[1]);
    expect(delays).toContain(500);  // baseDelay * 2^0
    expect(delays).toContain(1000); // baseDelay * 2^1
  });

  it('400 에러는 즉시 throw한다 (재시도 안 함)', async () => {
    const err = makeHttpError(400);
    const fn = vi.fn().mockRejectedValue(err);

    await expect(retry(fn, 3, 100)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('401 에러는 즉시 throw한다 (재시도 안 함)', async () => {
    const err = makeHttpError(401);
    const fn = vi.fn().mockRejectedValue(err);

    await expect(retry(fn, 3, 100)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('403 에러는 즉시 throw한다 (재시도 안 함)', async () => {
    const err = makeHttpError(403);
    const fn = vi.fn().mockRejectedValue(err);

    await expect(retry(fn, 3, 100)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('404 에러는 즉시 throw한다 (재시도 안 함)', async () => {
    const err = makeHttpError(404);
    const fn = vi.fn().mockRejectedValue(err);

    await expect(retry(fn, 3, 100)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('429 (Too Many Requests) 에러는 재시도한다', async () => {
    const err = makeHttpError(429);
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValue('ok');

    const promise = retry(fn, 3, 100);
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('500 에러는 재시도한다', async () => {
    const err = makeHttpError(500);
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValue('ok');

    const promise = retry(fn, 3, 100);
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('502 에러는 재시도한다', async () => {
    const err = makeHttpError(502);
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValue('ok');

    const promise = retry(fn, 3, 100);
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('503 에러는 재시도한다', async () => {
    const err = makeHttpError(503);
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValue('ok');

    const promise = retry(fn, 3, 100);
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('response 없는 네트워크 에러는 재시도한다', async () => {
    const networkErr = new Error('ECONNREFUSED');
    const fn = vi.fn().mockRejectedValueOnce(networkErr).mockResolvedValue('ok');

    const promise = retry(fn, 3, 100);
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('maxRetries=1이면 재시도 없이 즉시 throw한다', async () => {
    const err = new Error('fail');
    const fn = vi.fn().mockRejectedValue(err);

    await expect(retry(fn, 1, 100)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('기본 maxRetries는 3이다', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    let caught: unknown;
    const promise = retry(fn, undefined, 100).catch((e) => { caught = e; });
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    expect((caught as Error).message).toBe('fail');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('재시도 시 logger.warn을 호출한다', async () => {
    const { logger } = await import('../src/main/utils/logger');
    const fn = vi.fn().mockRejectedValueOnce(new Error('transient')).mockResolvedValue('ok');

    const promise = retry(fn, 3, 100);
    await vi.advanceTimersByTimeAsync(100);
    await promise;

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logger.warn).mock.calls[0][0]).toMatch(/Retry 1\/3 after 100ms/);
  });

  it('response.data가 있으면 warn 로그에 포함한다', async () => {
    const { logger } = await import('../src/main/utils/logger');
    const err = makeHttpError(503, { message: 'Service Unavailable' });
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValue('ok');

    const promise = retry(fn, 3, 100);
    await vi.advanceTimersByTimeAsync(100);
    await promise;

    const warnArgs = vi.mocked(logger.warn).mock.calls[0];
    expect(warnArgs[2]).toContain('Service Unavailable');
  });

  it('string 에러도 재시도하고 마지막 에러를 throw한다', async () => {
    const fn = vi.fn().mockRejectedValue('string error');

    let caught: unknown;
    const promise = retry(fn, 2, 100).catch((e) => { caught = e; });
    await vi.advanceTimersByTimeAsync(100);
    await promise;

    expect(caught).toBe('string error');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('null-like 응답 객체는 재시도 대상으로 간주한다', async () => {
    // response가 있지만 status가 없는 경우 → isNonRetryableError = false
    const err = Object.assign(new Error('weird'), { response: { status: undefined } });
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValue('ok');

    const promise = retry(fn, 3, 100);
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
