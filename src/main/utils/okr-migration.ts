import type { OKRData } from '../schemas/storage.schema';

interface LegacyRelation {
  id: string;
  fromLinkId?: string;
  toLinkId?: string;
  fromType?: string;
  fromId?: string;
  fromAnchor?: string;
  toType?: string;
  toId?: string;
  toAnchor?: string;
  waypoints?: { x: number; y: number }[];
  label?: string;
}

/**
 * Migrate a single relation from old format (fromLinkId/toLinkId) to new format.
 */
export function migrateRelation(rel: LegacyRelation) {
  // Already in new format
  if (rel.fromType && rel.fromId && rel.toType && rel.toId && rel.fromAnchor && rel.toAnchor) {
    return rel;
  }
  // Old format: fromLinkId / toLinkId (always card links)
  if (rel.fromLinkId && rel.toLinkId) {
    return {
      id: rel.id,
      fromType: 'link' as const,
      fromId: rel.fromLinkId,
      fromAnchor: 'right' as const,
      toType: 'link' as const,
      toId: rel.toLinkId,
      toAnchor: 'left' as const,
      waypoints: rel.waypoints,
      label: rel.label,
    };
  }
  // Unknown format, return as-is
  return rel;
}

/**
 * Migrate all relations in OKR data from legacy to new format.
 * Called during data loading to ensure backward compatibility.
 */
export function migrateOKRRelations(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.relations)) return data;
  return {
    ...d,
    relations: d.relations.map((r: unknown) => migrateRelation(r as LegacyRelation)),
  };
}
