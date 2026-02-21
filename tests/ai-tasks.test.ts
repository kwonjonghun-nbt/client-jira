import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  createTaskId,
  generateTaskTitle,
  countRunningTasks,
  countCompletedTasks,
  mergeSubJobResults,
  formatElapsedTime,
  resolveJobDone,
  resolveJobError,
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

    it('should generate issue-analysis title with issueKey', () => {
      expect(generateTaskTitle('issue-analysis', { issueKey: 'PROJ-123' })).toBe('티켓 분석 (PROJ-123)');
    });

    it('should generate issue-analysis title without issueKey', () => {
      expect(generateTaskTitle('issue-analysis', {})).toBe('티켓 분석');
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

  describe('countCompletedTasks', () => {
    it('done과 error 태스크를 카운트한다 (running은 제외)', () => {
      const tasks: AITask[] = [
        { id: '1', jobIds: [], type: 'report', title: '', status: 'done', result: '', error: null, createdAt: 0 },
        { id: '2', jobIds: [], type: 'report', title: '', status: 'error', result: '', error: 'err', createdAt: 0 },
        { id: '3', jobIds: [], type: 'report', title: '', status: 'running', result: '', error: null, createdAt: 0 },
      ];
      expect(countCompletedTasks(tasks)).toBe(2);
    });

    it('빈 배열이면 0을 반환한다', () => {
      expect(countCompletedTasks([])).toBe(0);
    });

    it('모두 running이면 0이다', () => {
      const tasks: AITask[] = [
        { id: '1', jobIds: [], type: 'report', title: '', status: 'running', result: '', error: null, createdAt: 0 },
        { id: '2', jobIds: [], type: 'report', title: '', status: 'running', result: '', error: null, createdAt: 0 },
      ];
      expect(countCompletedTasks(tasks)).toBe(0);
    });
  });

  describe('resolveJobDone', () => {
    const baseTask: AITask = {
      id: 't1',
      jobIds: ['job-1'],
      type: 'report',
      title: 'Test',
      status: 'running',
      result: '',
      error: null,
      createdAt: 0,
    };

    it('단일 job 완료: status가 "done"으로 변경', () => {
      const result = resolveJobDone(baseTask, 'job-1');
      expect(result.status).toBe('done');
    });

    it('jobId가 없으면 원본 task 반환', () => {
      const result = resolveJobDone(baseTask, 'job-999');
      expect(result).toBe(baseTask);
    });

    it('multi-job: 하나 완료, 아직 남은 subJob → status는 "running" 유지', () => {
      const task: AITask = {
        ...baseTask,
        jobIds: ['job-1', 'job-2'],
        subJobs: {
          'job-1': { assignee: 'Alice', status: 'running', result: '' },
          'job-2': { assignee: 'Bob', status: 'running', result: '' },
        },
      };
      const result = resolveJobDone(task, 'job-1');
      expect(result.status).toBe('running');
      expect(result.subJobs!['job-1'].status).toBe('done');
      expect(result.subJobs!['job-2'].status).toBe('running');
    });

    it('multi-job: 마지막 subJob 완료 → status "done", result가 mergeSubJobResults 결과', () => {
      const task: AITask = {
        ...baseTask,
        jobIds: ['job-1', 'job-2'],
        subJobs: {
          'job-1': { assignee: 'Alice', status: 'done', result: '내용1' },
          'job-2': { assignee: 'Bob', status: 'running', result: '' },
        },
      };
      const result = resolveJobDone(task, 'job-2');
      expect(result.status).toBe('done');
      expect(result.result).toContain('Alice');
      expect(result.result).toContain('내용1');
    });
  });

  describe('resolveJobError', () => {
    const baseTask: AITask = {
      id: 't1',
      jobIds: ['job-1'],
      type: 'report',
      title: 'Test',
      status: 'running',
      result: '',
      error: null,
      createdAt: 0,
    };

    it('단일 job 에러: status "error", error 메시지 설정', () => {
      const result = resolveJobError(baseTask, 'job-1', '실패 메시지');
      expect(result.status).toBe('error');
      expect(result.error).toBe('실패 메시지');
    });

    it('jobId가 없으면 원본 task 반환', () => {
      const result = resolveJobError(baseTask, 'job-999', '에러');
      expect(result).toBe(baseTask);
    });

    it('multi-job: 하나 에러, 남은 subJob → status "running" 유지', () => {
      const task: AITask = {
        ...baseTask,
        jobIds: ['job-1', 'job-2'],
        subJobs: {
          'job-1': { assignee: 'Alice', status: 'running', result: '' },
          'job-2': { assignee: 'Bob', status: 'running', result: '' },
        },
      };
      const result = resolveJobError(task, 'job-1', '에러');
      expect(result.status).toBe('running');
      expect(result.subJobs!['job-1'].status).toBe('error');
      expect(result.subJobs!['job-2'].status).toBe('running');
    });

    it('multi-job: 모두 에러 → status "error"', () => {
      const task: AITask = {
        ...baseTask,
        jobIds: ['job-1', 'job-2'],
        subJobs: {
          'job-1': { assignee: 'Alice', status: 'error', result: '' },
          'job-2': { assignee: 'Bob', status: 'running', result: '' },
        },
      };
      const result = resolveJobError(task, 'job-2', '에러');
      expect(result.status).toBe('error');
    });

    it('multi-job: 일부 done + 일부 error → 최종 status "done"', () => {
      const task: AITask = {
        ...baseTask,
        jobIds: ['job-1', 'job-2'],
        subJobs: {
          'job-1': { assignee: 'Alice', status: 'done', result: '내용1' },
          'job-2': { assignee: 'Bob', status: 'running', result: '' },
        },
      };
      const result = resolveJobError(task, 'job-2', '에러');
      expect(result.status).toBe('done');
    });
  });
});
