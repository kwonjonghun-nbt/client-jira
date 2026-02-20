export function buildTaskNotificationBody(status: 'done' | 'error'): string {
  return status === 'done'
    ? 'AI 작업이 완료되었습니다.'
    : 'AI 작업 중 오류가 발생했습니다.';
}
