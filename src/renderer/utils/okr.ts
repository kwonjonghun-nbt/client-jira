import { mean } from 'es-toolkit/math';
import type {
  OKRData,
  OKRJiraLink,
  OKRKeyResult,
  OKRLink,
  NormalizedIssue,
} from '../types/jira.types';

// ─── Progress helpers ─────────────────────────────────────────────────────────

function isJiraLink(l: OKRLink): l is OKRJiraLink {
  return l.type === 'jira';
}

export function calcKRProgress(
  krId: string,
  links: OKRLink[],
  issueMap: Map<string, NormalizedIssue>,
): number {
  const krLinks = links.filter((l) => l.keyResultId === krId).filter(isJiraLink);
  if (krLinks.length === 0) return 0;
  const doneCount = krLinks.filter((l) => {
    const issue = issueMap.get(l.issueKey);
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
  return Math.round(mean(krs.map((kr) => calcKRProgress(kr.id, links, issueMap))));
}

// ─── Export helpers ───────────────────────────────────────────────────────────

export function buildOKRExportData(
  okr: OKRData,
  issueMap: Map<string, NormalizedIssue>,
): Record<string, unknown> {
  const vtMap = new Map(okr.virtualTickets.map((vt) => [vt.id, vt]));

  // P3-15: O(1) 조회를 위한 Map 사전 구축
  const groupMap = new Map(okr.groups.map((g) => [g.id, g]));

  const krsByObjective = new Map<string, typeof okr.keyResults>();
  for (const kr of okr.keyResults) {
    const list = krsByObjective.get(kr.objectiveId) ?? [];
    list.push(kr);
    krsByObjective.set(kr.objectiveId, list);
  }

  const linksByKR = new Map<string, typeof okr.links>();
  for (const l of okr.links) {
    const list = linksByKR.get(l.keyResultId) ?? [];
    list.push(l);
    linksByKR.set(l.keyResultId, list);
  }

  const groupsByKR = new Map<string, typeof okr.groups>();
  for (const g of okr.groups) {
    const list = groupsByKR.get(g.keyResultId) ?? [];
    list.push(g);
    groupsByKR.set(g.keyResultId, list);
  }

  const enrichLink = (link: OKRLink) => {
    const base: Record<string, unknown> = {
      id: link.id,
      type: link.type,
      order: link.order,
    };
    if (link.groupId) {
      const group = groupMap.get(link.groupId);
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
      keyResults: (krsByObjective.get(obj.id) ?? []).map((kr) => ({
        id: kr.id,
        title: kr.title,
        description: kr.description ?? null,
        links: (linksByKR.get(kr.id) ?? []).map(enrichLink),
        groups: (groupsByKR.get(kr.id) ?? []).map(enrichGroup),
      })),
    })),
    relations: okr.relations,
  };
}
