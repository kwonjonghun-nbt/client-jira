import type { NormalizedIssue } from '../types/jira.types';

export function downloadIssueJson(issue: NormalizedIssue): void {
  const json = JSON.stringify(issue, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${issue.key}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
