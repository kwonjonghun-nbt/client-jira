import type {
  OKRData,
  OKRKeyResult,
  OKRLink,
  OKRGroup,
  OKRRelation,
  VirtualTicket,
  NormalizedIssue,
  AnchorPosition,
  CanvasChanges,
  CanvasChangeGroup,
  CanvasChangeLink,
  CanvasChangeRelation,
  CanvasChangeVirtualTicket,
} from '../types/jira.types';
import { CARD_W, CARD_H, assignDefaultPosition, type Rect } from '../hooks/okr/okr-canvas.types';

// ─── Canvas context for AI ──────────────────────────────────────────────────

interface CanvasContextLink {
  id: string;
  type: 'jira' | 'virtual';
  issueKey?: string;
  virtualTicketId?: string;
  title: string;
  status?: string;
  issueType?: string;
  assignee?: string;
  groupId?: string;
  x: number;
  y: number;
}

interface CanvasContextGroup {
  id: string;
  title: string;
  parentGroupId?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface CanvasContextRelation {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
}

interface CanvasContext {
  krTitle: string;
  links: CanvasContextLink[];
  groups: CanvasContextGroup[];
  relations: CanvasContextRelation[];
  virtualTickets: { id: string; title: string; issueType: string; assignee?: string }[];
}

// ─── Build context ──────────────────────────────────────────────────────────

export function buildCanvasContext(
  kr: OKRKeyResult,
  okr: OKRData,
  issueMap: Map<string, NormalizedIssue>,
): CanvasContext {
  const krLinks = okr.links.filter((l) => l.keyResultId === kr.id);
  const krGroups = okr.groups.filter((g) => g.keyResultId === kr.id);
  const krRelations = okr.relations.filter((r) => {
    const linkIds = new Set(krLinks.map((l) => l.id));
    const groupIds = new Set(krGroups.map((g) => g.id));
    const fromMatch =
      (r.fromType === 'link' && linkIds.has(r.fromId)) ||
      (r.fromType === 'group' && groupIds.has(r.fromId));
    const toMatch =
      (r.toType === 'link' && linkIds.has(r.toId)) ||
      (r.toType === 'group' && groupIds.has(r.toId));
    return fromMatch || toMatch;
  });

  const links: CanvasContextLink[] = krLinks.map((l) => {
    if (l.type === 'jira' && l.issueKey) {
      const issue = issueMap.get(l.issueKey);
      return {
        id: l.id,
        type: 'jira' as const,
        issueKey: l.issueKey,
        title: issue?.summary ?? l.issueKey,
        status: issue?.status,
        issueType: issue?.issueType,
        assignee: issue?.assignee ?? undefined,
        groupId: l.groupId,
        x: l.x ?? 0,
        y: l.y ?? 0,
      };
    }
    const vt = okr.virtualTickets.find((v) => v.id === l.virtualTicketId);
    return {
      id: l.id,
      type: 'virtual' as const,
      virtualTicketId: l.virtualTicketId,
      title: vt?.title ?? '가상 티켓',
      issueType: vt?.issueType,
      assignee: vt?.assignee,
      groupId: l.groupId,
      x: l.x ?? 0,
      y: l.y ?? 0,
    };
  });

  const groups: CanvasContextGroup[] = krGroups.map((g) => ({
    id: g.id,
    title: g.title,
    parentGroupId: g.parentGroupId,
    x: g.x ?? 0,
    y: g.y ?? 0,
    w: g.w ?? 320,
    h: g.h ?? 200,
  }));

  const relations: CanvasContextRelation[] = krRelations.map((r) => ({
    id: r.id,
    fromId: r.fromId,
    toId: r.toId,
    label: r.label,
  }));

  const vtIds = new Set(krLinks.filter((l) => l.type === 'virtual').map((l) => l.virtualTicketId!));
  const virtualTickets = okr.virtualTickets
    .filter((vt) => vtIds.has(vt.id))
    .map((vt) => ({
      id: vt.id,
      title: vt.title,
      issueType: vt.issueType,
      assignee: vt.assignee,
    }));

  return { krTitle: kr.title, links, groups, relations, virtualTickets };
}

// ─── Build prompt ───────────────────────────────────────────────────────────

export function buildCanvasPrompt(userPrompt: string, context: CanvasContext): string {
  const systemInstruction = `You are a canvas layout AI assistant for an OKR management tool.
You receive the current canvas state of a Key Result and the user's instruction.
You must output ONLY a valid JSON object (no markdown fences, no explanation) that describes changes to apply.

The canvas has these elements:
- **links**: Cards on the canvas (Jira tickets or virtual tickets). Each has an id, type, title, position (x,y), and optionally a groupId.
- **groups**: Containers that hold links. Each has an id, title, position (x,y), dimensions (w,h), and optionally a parentGroupId for nesting.
- **relations**: Arrows connecting links or groups. Each has fromId, toId, and optionally a label.
- **virtualTickets**: Proposed/planned tickets not yet in Jira.

Your JSON output must follow this schema:
{
  "groups": [
    { "action": "add", "title": "...", "x": 0, "y": 0, "w": 320, "h": 200 },
    { "action": "update", "id": "existing-group-id", "title": "new title" },
    { "action": "delete", "id": "existing-group-id" }
  ],
  "links": [
    { "action": "update", "id": "existing-link-id", "groupId": "group-id-or-null", "x": 100, "y": 100 }
  ],
  "relations": [
    { "action": "add", "fromId": "link-or-group-id", "toId": "link-or-group-id", "fromAnchor": "bottom", "toAnchor": "top", "label": "depends on" },
    { "action": "delete", "id": "existing-relation-id" }
  ],
  "virtualTickets": [
    { "action": "add", "title": "...", "issueType": "task", "groupId": "optional-group-id" }
  ]
}

Rules:
- Only include arrays that have changes. Omit empty arrays.
- For "update" actions, only include fields that change.
- link positions use absolute canvas coordinates. Card size is 200x90.
- Group default size is 320x200. Leave space for a 36px header.
- Anchor positions: "top", "bottom", "left", "right".
- When creating groups and assigning links to them, set the link's groupId to a temporary id like "new-group-1" and use the same id in the group's add action.
- When adding virtualTickets with a groupId, use the same temporary id pattern.
- Output ONLY the JSON object. No markdown, no explanation.`;

  const contextStr = JSON.stringify(context, null, 2);

  return `${systemInstruction}

--- CURRENT CANVAS STATE ---
${contextStr}

--- USER INSTRUCTION ---
${userPrompt}`;
}

// ─── Parse response ─────────────────────────────────────────────────────────

export function parseCanvasResponse(raw: string): CanvasChanges | null {
  const trimmed = raw.trim();

  // Try to extract JSON from markdown code block first
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;

  // Find the outermost JSON object
  const startIdx = jsonStr.indexOf('{');
  const endIdx = jsonStr.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return null;

  try {
    const parsed = JSON.parse(jsonStr.slice(startIdx, endIdx + 1));
    return validateCanvasChanges(parsed);
  } catch {
    return null;
  }
}

function validateCanvasChanges(data: unknown): CanvasChanges | null {
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;
  const result: CanvasChanges = {};

  if (Array.isArray(obj.groups)) {
    result.groups = obj.groups.filter(isValidGroupChange);
  }
  if (Array.isArray(obj.links)) {
    result.links = obj.links.filter(isValidLinkChange);
  }
  if (Array.isArray(obj.relations)) {
    result.relations = obj.relations.filter(isValidRelationChange);
  }
  if (Array.isArray(obj.virtualTickets)) {
    result.virtualTickets = obj.virtualTickets.filter(isValidVirtualTicketChange);
  }

  const hasChanges =
    (result.groups?.length ?? 0) > 0 ||
    (result.links?.length ?? 0) > 0 ||
    (result.relations?.length ?? 0) > 0 ||
    (result.virtualTickets?.length ?? 0) > 0;

  return hasChanges ? result : null;
}

function isValidGroupChange(g: unknown): g is CanvasChangeGroup {
  if (typeof g !== 'object' || g === null) return false;
  const obj = g as Record<string, unknown>;
  if (obj.action === 'add') return typeof obj.title === 'string';
  if (obj.action === 'update') return typeof obj.id === 'string';
  if (obj.action === 'delete') return typeof obj.id === 'string';
  return false;
}

function isValidLinkChange(l: unknown): l is CanvasChangeLink {
  if (typeof l !== 'object' || l === null) return false;
  const obj = l as Record<string, unknown>;
  return obj.action === 'update' && typeof obj.id === 'string';
}

function isValidRelationChange(r: unknown): r is CanvasChangeRelation {
  if (typeof r !== 'object' || r === null) return false;
  const obj = r as Record<string, unknown>;
  if (obj.action === 'add') return typeof obj.fromId === 'string' && typeof obj.toId === 'string';
  if (obj.action === 'delete') return typeof obj.id === 'string';
  return false;
}

function isValidVirtualTicketChange(v: unknown): v is CanvasChangeVirtualTicket {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  return obj.action === 'add' && typeof obj.title === 'string';
}

// ─── Merge changes ──────────────────────────────────────────────────────────

export function mergeCanvasChanges(
  okr: OKRData,
  krId: string,
  changes: CanvasChanges,
): OKRData {
  let result = { ...okr };

  // Track temporary ID → real ID mapping for new groups
  const tempIdMap = new Map<string, string>();

  // 1. Process group changes
  if (changes.groups) {
    let groups = [...result.groups];
    const krGroups = groups.filter((g) => g.keyResultId === krId);

    for (const change of changes.groups) {
      if (change.action === 'add' && change.title) {
        const newId = crypto.randomUUID();
        // Map temp ID if provided
        if (change.id) tempIdMap.set(change.id, newId);

        const resolvedParent = change.parentGroupId
          ? (tempIdMap.get(change.parentGroupId) ?? change.parentGroupId)
          : undefined;

        const occupied: Rect[] = getOccupiedRects(groups, result.links, krId, resolvedParent);
        const w = change.w ?? 320;
        const h = change.h ?? 200;
        const pos = (change.x != null && change.y != null)
          ? { x: change.x, y: change.y }
          : assignDefaultPosition(occupied, w, h, 800);

        groups.push({
          id: newId,
          keyResultId: krId,
          parentGroupId: resolvedParent,
          title: change.title,
          order: krGroups.length + groups.filter((g) => g.keyResultId === krId).length,
          x: pos.x,
          y: pos.y,
          w,
          h,
        });
      } else if (change.action === 'update' && change.id) {
        groups = groups.map((g) => {
          if (g.id !== change.id) return g;
          return {
            ...g,
            ...(change.title != null && { title: change.title }),
            ...(change.x != null && { x: change.x }),
            ...(change.y != null && { y: change.y }),
            ...(change.w != null && { w: change.w }),
            ...(change.h != null && { h: change.h }),
            ...(change.parentGroupId !== undefined && {
              parentGroupId: tempIdMap.get(change.parentGroupId!) ?? change.parentGroupId ?? undefined,
            }),
          };
        });
      } else if (change.action === 'delete' && change.id) {
        const deleteId = change.id;
        groups = groups.filter((g) => g.id !== deleteId && g.parentGroupId !== deleteId);
      }
    }
    result = { ...result, groups };
  }

  // 2. Process link changes (position, groupId)
  if (changes.links) {
    let links = [...result.links];
    for (const change of changes.links) {
      if (change.action === 'update' && change.id) {
        links = links.map((l) => {
          if (l.id !== change.id) return l;
          return {
            ...l,
            ...(change.x != null && { x: change.x }),
            ...(change.y != null && { y: change.y }),
            ...(change.groupId !== undefined && {
              groupId: change.groupId === null
                ? undefined
                : (tempIdMap.get(change.groupId) ?? change.groupId),
            }),
          };
        });
      }
    }
    result = { ...result, links };
  }

  // 3. Process virtualTicket additions
  if (changes.virtualTickets) {
    let virtualTickets = [...result.virtualTickets];
    let links = [...result.links];

    for (const change of changes.virtualTickets) {
      if (change.action === 'add') {
        const vtId = crypto.randomUUID();
        virtualTickets.push({
          id: vtId,
          title: change.title,
          issueType: change.issueType || 'task',
          assignee: change.assignee,
          createdAt: new Date().toISOString(),
        });

        const resolvedGroupId = change.groupId
          ? (tempIdMap.get(change.groupId) ?? change.groupId)
          : undefined;

        const krLinks = links.filter((l) => l.keyResultId === krId);
        const krGroups = result.groups.filter((g) => g.keyResultId === krId);
        const occupied: Rect[] = [
          ...krLinks.map((l) => ({ x: l.x ?? 0, y: l.y ?? 0, w: CARD_W, h: CARD_H })),
          ...krGroups.map((g) => ({ x: g.x ?? 0, y: g.y ?? 0, w: g.w ?? 320, h: g.h ?? 200 })),
        ];
        const pos = assignDefaultPosition(occupied, CARD_W, CARD_H, 800);

        links.push({
          id: crypto.randomUUID(),
          keyResultId: krId,
          type: 'virtual',
          virtualTicketId: vtId,
          groupId: resolvedGroupId,
          order: krLinks.length,
          x: pos.x,
          y: pos.y,
        });
      }
    }
    result = { ...result, virtualTickets, links };
  }

  // 4. Process relation changes
  if (changes.relations) {
    let relations = [...result.relations];
    for (const change of changes.relations) {
      if (change.action === 'add' && change.fromId && change.toId) {
        const resolvedFromId = tempIdMap.get(change.fromId) ?? change.fromId;
        const resolvedToId = tempIdMap.get(change.toId) ?? change.toId;

        // Determine endpoint types
        const allLinkIds = new Set(result.links.map((l) => l.id));
        const allGroupIds = new Set(result.groups.map((g) => g.id));
        const fromType = allGroupIds.has(resolvedFromId) ? 'group' : 'link';
        const toType = allGroupIds.has(resolvedToId) ? 'group' : 'link';

        // Skip if neither endpoint exists
        if (!allLinkIds.has(resolvedFromId) && !allGroupIds.has(resolvedFromId)) continue;
        if (!allLinkIds.has(resolvedToId) && !allGroupIds.has(resolvedToId)) continue;

        const validAnchors: AnchorPosition[] = ['top', 'bottom', 'left', 'right'];
        const fromAnchor = validAnchors.includes(change.fromAnchor as AnchorPosition)
          ? (change.fromAnchor as AnchorPosition)
          : 'bottom';
        const toAnchor = validAnchors.includes(change.toAnchor as AnchorPosition)
          ? (change.toAnchor as AnchorPosition)
          : 'top';

        relations.push({
          id: crypto.randomUUID(),
          fromType,
          fromId: resolvedFromId,
          fromAnchor: fromAnchor,
          toType,
          toId: resolvedToId,
          toAnchor: toAnchor,
          label: change.label,
        });
      } else if (change.action === 'delete' && change.id) {
        relations = relations.filter((r) => r.id !== change.id);
      }
    }
    result = { ...result, relations };
  }

  result.updatedAt = new Date().toISOString();
  return result;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getOccupiedRects(
  groups: OKRGroup[],
  links: OKRLink[],
  krId: string,
  parentGroupId?: string,
): Rect[] {
  if (parentGroupId) {
    const siblingGroups = groups.filter((g) => g.parentGroupId === parentGroupId);
    const siblingLinks = links.filter((l) => l.groupId === parentGroupId);
    return [
      ...siblingGroups.map((g) => ({ x: g.x ?? 0, y: g.y ?? 0, w: g.w ?? 280, h: g.h ?? 160 })),
      ...siblingLinks.map((l) => ({ x: l.x ?? 0, y: l.y ?? 0, w: CARD_W, h: CARD_H })),
    ];
  }
  const topGroups = groups.filter((g) => g.keyResultId === krId && !g.parentGroupId);
  const ungroupedLinks = links.filter((l) => l.keyResultId === krId && !l.groupId);
  return [
    ...topGroups.map((g) => ({ x: g.x ?? 0, y: g.y ?? 0, w: g.w ?? 320, h: g.h ?? 200 })),
    ...ungroupedLinks.map((l) => ({ x: l.x ?? 0, y: l.y ?? 0, w: CARD_W, h: CARD_H })),
  ];
}
