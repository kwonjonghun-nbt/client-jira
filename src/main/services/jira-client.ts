import axios, { type AxiosInstance } from 'axios';
import { JiraSearchResponseSchema, JiraProjectSchema } from '../schemas/jira.schema';
import { retry } from '../utils/retry';
import { logger } from '../utils/logger';
import type { JiraIssue, JiraProject, JiraSearchResponse } from '../schemas/jira.schema';

const FIELDS = [
  'summary', 'description', 'status', 'assignee', 'reporter', 'priority',
  'issuetype', 'created', 'updated', 'duedate', 'labels',
  'components', 'resolution', 'timetracking', 'parent', 'subtasks', 'issuelinks',
  'customfield_10016', // Story Points
  'customfield_10020', // Sprint
];

const MAX_RESULTS = 100;

export class JiraClient {
  private client: AxiosInstance;

  constructor(baseUrl: string, email: string, apiToken: string) {
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    this.client = axios.create({
      baseURL: baseUrl.replace(/\/+$/, ''),
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async testConnection(): Promise<{ success: boolean; displayName?: string; error?: string }> {
    try {
      const response = await this.client.get('/rest/api/3/myself');
      return {
        success: true,
        displayName: response.data.displayName,
      };
    } catch (error: any) {
      const message =
        error.response?.data?.errorMessages?.[0] ||
        error.response?.data?.message ||
        error.message;
      return { success: false, error: message };
    }
  }

  async getProjects(): Promise<JiraProject[]> {
    const response = await retry(() => this.client.get('/rest/api/3/project'));
    return response.data.map((p: any) => JiraProjectSchema.parse({ key: p.key, name: p.name, id: p.id }));
  }

  async searchIssues(jql: string, nextPageToken?: string): Promise<JiraSearchResponse> {
    const body: Record<string, unknown> = {
      jql,
      maxResults: MAX_RESULTS,
      fields: FIELDS,
    };
    if (nextPageToken) {
      body.nextPageToken = nextPageToken;
    }

    const response = await retry(() =>
      this.client.post('/rest/api/3/search/jql', body),
    );

    return JiraSearchResponseSchema.parse(response.data);
  }

  async fetchAllIssues(
    jql: string,
    onProgress?: (current: number, total: number) => void,
  ): Promise<JiraIssue[]> {
    const allIssues: JiraIssue[] = [];
    let nextPageToken: string | undefined;

    do {
      const result = await this.searchIssues(jql, nextPageToken);
      allIssues.push(...result.issues);
      nextPageToken = result.nextPageToken;

      const total = result.total ?? allIssues.length;
      logger.debug(`Fetched ${allIssues.length}/${total} issues`);
      onProgress?.(allIssues.length, total);
    } while (nextPageToken);

    return allIssues;
  }

  buildJql(projects: string[], assignees: string[], customJql: string): string {
    const parts: string[] = [];

    if (projects.length > 0) {
      const projectList = projects.map((p) => `"${p}"`).join(', ');
      parts.push(`project IN (${projectList})`);
    }

    if (assignees.length > 0) {
      // 본인 + 지정 담당자 모두 조회
      const assigneeList = assignees.map((a) => `"${a}"`).join(', ');
      parts.push(`assignee IN (currentUser(), ${assigneeList})`);
    } else {
      // 담당자 미지정 시 현재 사용자의 이슈만 가져옴
      parts.push('assignee = currentUser()');
    }

    if (customJql.trim()) {
      parts.push(`(${customJql.trim()})`);
    }

    const jql = parts.length > 0 ? parts.join(' AND ') : 'ORDER BY updated DESC';
    return jql.includes('ORDER BY') ? jql : `${jql} ORDER BY updated DESC`;
  }

  async fetchIssueChangelog(issueKey: string): Promise<{ created: string; items: { field: string; fromString: string | null; toString: string | null }[] }[]> {
    const allHistories: { created: string; items: { field: string; fromString: string | null; toString: string | null }[] }[] = [];
    let startAt = 0;
    const maxResults = 100;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await retry(() =>
        this.client.get(`/rest/api/3/issue/${issueKey}/changelog`, {
          params: { startAt, maxResults },
        }),
      );

      const { values, total } = response.data;
      for (const entry of values) {
        allHistories.push({
          created: entry.created,
          items: (entry.items ?? []).map((item: any) => ({
            field: item.field,
            fromString: item.fromString ?? null,
            toString: item.toString ?? null,
          })),
        });
      }

      startAt += values.length;
      if (startAt >= total) break;
    }

    return allHistories;
  }
}
