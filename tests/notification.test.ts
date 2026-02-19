import { describe, it, expect } from 'vitest';
import { buildTaskNotificationBody } from '../src/main/utils/notification';

describe('buildTaskNotificationBody', () => {
  it('완료 시 성공 메시지를 반환한다', () => {
    expect(buildTaskNotificationBody('done')).toBe('AI 작업이 완료되었습니다.');
  });

  it('오류 시 오류 메시지를 반환한다', () => {
    expect(buildTaskNotificationBody('error')).toBe('AI 작업 중 오류가 발생했습니다.');
  });
});
