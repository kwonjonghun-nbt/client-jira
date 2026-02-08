import type { NormalizedIssue, ChangelogEntry } from '../schemas/storage.schema';

export function diffIssues(
  prevIssues: NormalizedIssue[],
  currIssues: NormalizedIssue[],
  detectedAt: string,
): ChangelogEntry[] {
  const prevMap = new Map<string, NormalizedIssue>();
  for (const issue of prevIssues) {
    prevMap.set(issue.key, issue);
  }

  const entries: ChangelogEntry[] = [];

  for (const curr of currIssues) {
    const prev = prevMap.get(curr.key);

    if (!prev) {
      entries.push({
        issueKey: curr.key,
        summary: curr.summary,
        changeType: 'created',
        oldValue: null,
        newValue: null,
        detectedAt,
      });
      continue;
    }

    if (prev.status !== curr.status) {
      entries.push({
        issueKey: curr.key,
        summary: curr.summary,
        changeType: 'status',
        oldValue: prev.status,
        newValue: curr.status,
        detectedAt,
      });
    }

    if (prev.assignee !== curr.assignee) {
      entries.push({
        issueKey: curr.key,
        summary: curr.summary,
        changeType: 'assignee',
        oldValue: prev.assignee,
        newValue: curr.assignee,
        detectedAt,
      });
    }

    if (prev.priority !== curr.priority) {
      entries.push({
        issueKey: curr.key,
        summary: curr.summary,
        changeType: 'priority',
        oldValue: prev.priority,
        newValue: curr.priority,
        detectedAt,
      });
    }

    if (prev.storyPoints !== curr.storyPoints) {
      entries.push({
        issueKey: curr.key,
        summary: curr.summary,
        changeType: 'storyPoints',
        oldValue: prev.storyPoints != null ? String(prev.storyPoints) : null,
        newValue: curr.storyPoints != null ? String(curr.storyPoints) : null,
        detectedAt,
      });
    }

    if (!prev.resolution && curr.resolution) {
      entries.push({
        issueKey: curr.key,
        summary: curr.summary,
        changeType: 'resolved',
        oldValue: null,
        newValue: curr.resolution,
        detectedAt,
      });
    }
  }

  return entries;
}
