import type { OKRLink, OKRRelation, OKRGroup, VirtualTicket } from '../types/jira.types';
import { GROUP_HEADER_H, getDescendantGroupIds, toAbsoluteCoords, getGroupDepth, MAX_GROUP_DEPTH } from '../hooks/okr/okr-canvas.types';

// ─── Data operation types ──────────────────────────────────────────────────

interface OKRLinksData {
  links: OKRLink[];
  virtualTickets: VirtualTicket[];
  relations: OKRRelation[];
}

interface OKRGroupsData {
  groups: OKRGroup[];
  links: OKRLink[];
  relations: OKRRelation[];
}

// ─── Link operations ───────────────────────────────────────────────────────

export function computeUnlinkWork(
  data: OKRLinksData,
  linkId: string,
): OKRLinksData {
  const linkToRemove = data.links.find((l) => l.id === linkId);
  const remainingLinks = data.links.filter((l) => l.id !== linkId);
  let virtualTickets = data.virtualTickets;

  if (linkToRemove?.type === 'virtual' && linkToRemove.virtualTicketId) {
    const vtId = linkToRemove.virtualTicketId;
    const stillLinked = remainingLinks.some(
      (l) => l.type === 'virtual' && l.virtualTicketId === vtId,
    );
    if (!stillLinked) {
      virtualTickets = virtualTickets.filter((vt) => vt.id !== vtId);
    }
  }

  return {
    links: remainingLinks,
    virtualTickets,
    relations: data.relations.filter(
      (r) =>
        !(r.fromType === 'link' && r.fromId === linkId) &&
        !(r.toType === 'link' && r.toId === linkId),
    ),
  };
}

// ─── Virtual ticket operations ─────────────────────────────────────────────

export function computeDeleteVirtualTicket(
  data: OKRLinksData,
  vtId: string,
): OKRLinksData {
  const removedLinkIds = new Set(
    data.links
      .filter((l) => l.type === 'virtual' && l.virtualTicketId === vtId)
      .map((l) => l.id),
  );

  return {
    virtualTickets: data.virtualTickets.filter((vt) => vt.id !== vtId),
    links: data.links.filter(
      (l) => !(l.type === 'virtual' && l.virtualTicketId === vtId),
    ),
    relations: data.relations.filter(
      (r) =>
        !(r.fromType === 'link' && removedLinkIds.has(r.fromId)) &&
        !(r.toType === 'link' && removedLinkIds.has(r.toId)),
    ),
  };
}

// ─── Group operations ──────────────────────────────────────────────────────

export function computeDeleteGroup(
  data: OKRGroupsData,
  groupId: string,
): OKRGroupsData {
  const descendantIds = getDescendantGroupIds(groupId, data.groups);
  const allDeletedIds = new Set([groupId, ...descendantIds]);

  return {
    groups: data.groups.filter((g) => !allDeletedIds.has(g.id)),
    links: data.links.map((l) =>
      l.groupId && allDeletedIds.has(l.groupId) ? { ...l, groupId: undefined } : l,
    ),
    relations: data.relations.filter(
      (r) =>
        !(r.fromType === 'group' && allDeletedIds.has(r.fromId)) &&
        !(r.toType === 'group' && allDeletedIds.has(r.toId)),
    ),
  };
}

// ─── Drag position calculation ─────────────────────────────────────────────

export function calcDragPosition(
  itemX: number,
  itemY: number,
  dx: number,
  dy: number,
  parentGroupId?: string,
): { x: number; y: number } {
  const rawX = itemX + dx;
  const rawY = itemY + dy;
  return {
    x: parentGroupId ? rawX : Math.max(0, rawX),
    y: parentGroupId ? rawY : Math.max(0, rawY),
  };
}

// ─── Group hit-test ────────────────────────────────────────────────────────

export function hitTestGroup(
  canvasX: number,
  canvasY: number,
  cardW: number,
  cardH: number,
  groups: OKRGroup[],
): string | undefined {
  const centerX = canvasX + cardW / 2;
  const centerY = canvasY + cardH / 2;

  // Sort by depth descending (deepest first) for proper nesting priority
  const sorted = [...groups].sort(
    (a, b) => getGroupDepth(b.id, groups) - getGroupDepth(a.id, groups),
  );

  for (const g of sorted) {
    const gAbs = toAbsoluteCoords(g.x ?? 0, g.y ?? 0, g.parentGroupId, groups);
    const gx = gAbs.x;
    const gy = gAbs.y;
    const gw = g.w ?? 320;
    const gh = g.h ?? 200;
    if (
      centerX >= gx && centerX <= gx + gw &&
      centerY >= gy + GROUP_HEADER_H && centerY <= gy + gh
    ) {
      return g.id;
    }
  }
  return undefined;
}
