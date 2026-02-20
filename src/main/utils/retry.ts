import { logger } from './logger';

/** 4xx (429 제외)는 재시도해도 결과가 같으므로 즉시 실패 */
function isNonRetryableError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'response' in error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) {
      return true;
    }
  }
  return false;
}

export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // 4xx (429 제외)는 즉시 throw — 재시도 무의미
      if (isNonRetryableError(error)) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        const message = error instanceof Error ? error.message : String(error);
        const responseData = (error instanceof Error && 'response' in error)
          ? (error as { response?: { data?: unknown } }).response?.data
          : undefined;
        logger.warn(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms:`, message, responseData ? JSON.stringify(responseData) : '');
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
