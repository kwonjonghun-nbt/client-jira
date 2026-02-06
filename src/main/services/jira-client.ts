import axios, { type AxiosInstance } from 'axios';
import { JiraSearchResponseSchema, JiraProjectSchema } from '../schemas/jira.schema';
import { retry } from '../utils/retry';
import { logger } from '../utils/logger';
import type { JiraIssue, JiraProject, JiraSearchResponse } from '../schemas/jira.schema';

const FIELDS = [
  'summary', 'status', 'assignee', 'reporter', 'priority',
  'issuetype', 'created', 'updated', 'duedate', 'labels',
  'components', 'resolution', 'timetracking', 'parent', 'subtasks',
  'customfield_10016', // Story Points
  'customfield_10020', // Sprint
].join(',');

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

  async searchIssues(jql: string, startAt = 0): Promise<JiraSearchResponse> {
    const response = await retry(() =>
      this.client.get('/rest/api/3/search', {
        params: {
          jql,
          startAt,
          maxResults: MAX_RESULTS,
          fields: FIELDS,
        },
      }),
    );

    return JiraSearchResponseSchema.parse(response.data);
  }

  async fetchAllIssues(
    jql: string,
    onProgress?: (current: number, total: number) => void,
  ): Promise<JiraIssue[]> {
    const allIssues: JiraIssue[] = [];
    let startAt = 0;
    let total = 0;

    do {
      const result = await this.searchIssues(jql, startAt);
      allIssues.push(...result.issues);
      total = result.total;
      startAt += result.maxResults;

      logger.debug(`Fetched ${allIssues.length}/${total} issues`);
      onProgress?.(allIssues.length, total);
    } while (allIssues.length < total);

    return allIssues;
  }

  buildJql(projects: string[], assignees: string[], customJql: string): string {
    const parts: string[] = [];

    if (projects.length > 0) {
      const projectList = projects.map((p) => `"${p}"`).join(', ');
      parts.push(`project IN (${projectList})`);
    }

    if (assignees.length > 0) {
      const assigneeList = assignees.map((a) => `"${a}"`).join(', ');
      parts.push(`assignee IN (${assigneeList})`);
    }

    if (customJql.trim()) {
      parts.push(`(${customJql.trim()})`);
    }

    const jql = parts.length > 0 ? parts.join(' AND ') : 'ORDER BY updated DESC';
    return jql.includes('ORDER BY') ? jql : `${jql} ORDER BY updated DESC`;
  }
}
