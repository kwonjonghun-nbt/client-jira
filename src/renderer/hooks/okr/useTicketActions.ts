import { useCallback } from 'react';
import { CARD_W, CARD_H, assignDefaultPosition, type Rect, type UpdateOKR } from './okr-canvas.types';

export function useTicketActions(krId: string, updateOKR: UpdateOKR) {
  const linkJiraIssue = useCallback((issueKey: string) => {
    updateOKR((d) => {
      const links = d.links.filter((l) => l.keyResultId === krId);
      const grps = d.groups.filter((g) => g.keyResultId === krId);
      const occupied: Rect[] = [
        ...links.map((l) => ({ x: l.x ?? 0, y: l.y ?? 0, w: CARD_W, h: CARD_H })),
        ...grps.map((g) => ({ x: g.x ?? 0, y: g.y ?? 0, w: g.w ?? 300, h: g.h ?? 200 })),
      ];
      const pos = assignDefaultPosition(occupied, CARD_W, CARD_H, 800);
      return {
        ...d,
        links: [
          ...d.links,
          {
            id: crypto.randomUUID(),
            keyResultId: krId,
            type: 'jira' as const,
            issueKey,
            order: links.length,
            x: pos.x,
            y: pos.y,
          },
        ],
      };
    });
  }, [krId, updateOKR]);

  const createAndLinkVirtual = useCallback((title: string, issueType: string, assignee: string) => {
    const vtId = crypto.randomUUID();
    updateOKR((d) => {
      const links = d.links.filter((l) => l.keyResultId === krId);
      const grps = d.groups.filter((g) => g.keyResultId === krId);
      const occupied: Rect[] = [
        ...links.map((l) => ({ x: l.x ?? 0, y: l.y ?? 0, w: CARD_W, h: CARD_H })),
        ...grps.map((g) => ({ x: g.x ?? 0, y: g.y ?? 0, w: g.w ?? 300, h: g.h ?? 200 })),
      ];
      const pos = assignDefaultPosition(occupied, CARD_W, CARD_H, 800);
      return {
        ...d,
        virtualTickets: [
          ...d.virtualTickets,
          {
            id: vtId,
            title,
            issueType,
            assignee: assignee || undefined,
            createdAt: new Date().toISOString(),
          },
        ],
        links: [
          ...d.links,
          {
            id: crypto.randomUUID(),
            keyResultId: krId,
            type: 'virtual' as const,
            virtualTicketId: vtId,
            order: links.length,
            x: pos.x,
            y: pos.y,
          },
        ],
      };
    });
  }, [krId, updateOKR]);

  const unlinkWork = useCallback((linkId: string) => {
    updateOKR((d) => {
      const linkToRemove = d.links.find((l) => l.id === linkId);
      const remainingLinks = d.links.filter((l) => l.id !== linkId);
      let virtualTickets = d.virtualTickets;
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
        ...d,
        links: remainingLinks,
        virtualTickets,
        relations: d.relations.filter((r) => r.fromLinkId !== linkId && r.toLinkId !== linkId),
      };
    });
  }, [updateOKR]);

  const deleteVirtualTicket = useCallback((vtId: string) => {
    if (!window.confirm('이 가상 티켓을 삭제하시겠습니까?')) return;
    updateOKR((d) => {
      const removedLinkIds = new Set(
        d.links.filter((l) => l.type === 'virtual' && l.virtualTicketId === vtId).map((l) => l.id),
      );
      return {
        ...d,
        virtualTickets: d.virtualTickets.filter((vt) => vt.id !== vtId),
        links: d.links.filter(
          (l) => !(l.type === 'virtual' && l.virtualTicketId === vtId),
        ),
        relations: d.relations.filter(
          (r) => !removedLinkIds.has(r.fromLinkId) && !removedLinkIds.has(r.toLinkId),
        ),
      };
    });
  }, [updateOKR]);

  return { linkJiraIssue, createAndLinkVirtual, unlinkWork, deleteVirtualTicket };
}
