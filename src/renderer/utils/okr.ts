import type {
  OKRData,
  OKRKeyResult,
  OKRLink,
  NormalizedIssue,
} from '../types/jira.types';

// ─── Progress helpers ─────────────────────────────────────────────────────────

export function calcKRProgress(
  krId: string,
  links: OKRLink[],
  issueMap: Map<string, NormalizedIssue>,
): number {
  const krLinks = links.filter((l) => l.keyResultId === krId && l.type === 'jira');
  if (krLinks.length === 0) return 0;
  const doneCount = krLinks.filter((l) => {
    const issue = issueMap.get(l.issueKey!);
    return issue?.statusCategory === 'done';
  }).length;
  return Math.round((doneCount / krLinks.length) * 100);
}

export function calcObjectiveProgress(
  objectiveId: string,
  keyResults: OKRKeyResult[],
  links: OKRLink[],
  issueMap: Map<string, NormalizedIssue>,
): number {
  const krs = keyResults.filter((kr) => kr.objectiveId === objectiveId);
  if (krs.length === 0) return 0;
  const total = krs.reduce(
    (sum, kr) => sum + calcKRProgress(kr.id, links, issueMap),
    0,
  );
  return Math.round(total / krs.length);
}

// ─── Export helpers ───────────────────────────────────────────────────────────

export function buildOKRExportData(
  okr: OKRData,
  issueMap: Map<string, NormalizedIssue>,
): Record<string, unknown> {
  const vtMap = new Map(okr.virtualTickets.map((vt) => [vt.id, vt]));

  const enrichLink = (link: OKRLink) => {
    const base: Record<string, unknown> = {
      id: link.id,
      type: link.type,
      order: link.order,
    };
    if (link.groupId) {
      const group = okr.groups.find((g) => g.id === link.groupId);
      base.group = group ? { id: group.id, title: group.title } : link.groupId;
    }
    if (link.type === 'jira' && link.issueKey) {
      const issue = issueMap.get(link.issueKey);
      base.issueKey = link.issueKey;
      if (issue) {
        base.summary = issue.summary;
        base.status = issue.status;
        base.statusCategory = issue.statusCategory;
        base.assignee = issue.assignee;
        base.priority = issue.priority;
        base.issueType = issue.issueType;
      }
    } else if (link.type === 'virtual' && link.virtualTicketId) {
      const vt = vtMap.get(link.virtualTicketId);
      if (vt) {
        base.virtualTicket = {
          id: vt.id,
          title: vt.title,
          description: vt.description ?? null,
          issueType: vt.issueType,
          assignee: vt.assignee ?? null,
        };
      }
    }
    return base;
  };

  const enrichGroup = (group: typeof okr.groups[number]) => ({
    id: group.id,
    title: group.title,
    order: group.order,
    parentGroupId: group.parentGroupId ?? null,
  });

  return {
    exportedAt: new Date().toISOString(),
    objectives: okr.objectives.map((obj) => ({
      id: obj.id,
      title: obj.title,
      description: obj.description ?? null,
      keyResults: okr.keyResults
        .filter((kr) => kr.objectiveId === obj.id)
        .map((kr) => ({
          id: kr.id,
          title: kr.title,
          description: kr.description ?? null,
          links: okr.links.filter((l) => l.keyResultId === kr.id).map(enrichLink),
          groups: okr.groups.filter((g) => g.keyResultId === kr.id).map(enrichGroup),
        })),
    })),
    relations: okr.relations,
  };
}
