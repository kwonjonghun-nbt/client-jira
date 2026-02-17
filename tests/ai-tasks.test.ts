import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  createTaskId,
  generateTaskTitle,
  countRunningTasks,
  mergeSubJobResults,
  formatElapsedTime,
  type AITask,
} from '../src/renderer/utils/ai-tasks';

describe('ai-tasks utils', () => {
  describe('createTaskId', () => {
    it('should return a unique string starting with "task-"', () => {
      const id1 = createTaskId();
      const id2 = createTaskId();
      expect(id1).toMatch(/^task-/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateTaskTitle', () => {
    it('should generate report title with assignee and dates', () => {
      const title = generateTaskTitle('report', {
        assignee: '홍길동',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });
      expect(title).toBe('리포트 생성 (홍길동, 2025-01-01~2025-01-31)');
    });

    it('should generate report title without meta', () => {
      expect(generateTaskTitle('report', {})).toBe('리포트 생성');
    });

    it('should generate daily-share title with assignee', () => {
      expect(generateTaskTitle('daily-share', { assignee: '김철수' })).toBe('일일공유 (김철수)');
    });

    it('should generate daily-share title without assignee', () => {
      expect(generateTaskTitle('daily-share', {})).toBe('일일공유');
    });

    it('should generate daily-share-multi title', () => {
      expect(generateTaskTitle('daily-share-multi', {})).toBe('일일공유 (전체)');
    });
  });

  describe('countRunningTasks', () => {
    it('should count only running tasks', () => {
      const tasks: AITask[] = [
        { id: '1', jobIds: [], type: 'report', title: '', status: 'running', result: '', error: null, createdAt: 0 },
        { id: '2', jobIds: [], type: 'report', title: '', status: 'done', result: '', error: null, createdAt: 0 },
        { id: '3', jobIds: [], type: 'report', title: '', status: 'running', result: '', error: null, createdAt: 0 },
        { id: '4', jobIds: [], type: 'report', title: '', status: 'error', result: '', error: 'err', createdAt: 0 },
      ];
      expect(countRunningTasks(tasks)).toBe(2);
    });

    it('should return 0 for empty array', () => {
      expect(countRunningTasks([])).toBe(0);
    });
  });

  describe('mergeSubJobResults', () => {
    it('should merge sub-job results with assignee headers', () => {
      const subJobs = {
        'job-1': { assignee: '홍길동', status: 'done' as const, result: '내용1' },
        'job-2': { assignee: '김철수', status: 'done' as const, result: '내용2' },
      };
      const merged = mergeSubJobResults(subJobs);
      expect(merged).toContain('## 홍길동');
      expect(merged).toContain('## 김철수');
      expect(merged).toContain('내용1');
      expect(merged).toContain('내용2');
      expect(merged).toContain('---');
    });

    it('should skip empty results', () => {
      const subJobs = {
        'job-1': { assignee: '홍길동', status: 'done' as const, result: '내용1' },
        'job-2': { assignee: '김철수', status: 'error' as const, result: '' },
      };
      const merged = mergeSubJobResults(subJobs);
      expect(merged).toContain('홍길동');
      expect(merged).not.toContain('김철수');
    });
  });

  describe('formatElapsedTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show seconds for recent tasks', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      expect(formatElapsedTime(now - 30_000)).toBe('30초 전 시작');
    });

    it('should show minutes', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      expect(formatElapsedTime(now - 180_000)).toBe('3분 전 시작');
    });

    it('should show hours', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      expect(formatElapsedTime(now - 7_200_000)).toBe('2시간 전 시작');
    });
  });
});
