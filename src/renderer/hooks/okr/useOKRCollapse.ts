import { useState, useCallback, useRef, useEffect } from 'react';
import type { OKRObjective } from '../../types/jira.types';

export function useOKRCollapse(objectives: OKRObjective[]) {
  const [collapsedObjectives, setCollapsedObjectives] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && objectives.length > 0) {
      initializedRef.current = true;
      setCollapsedObjectives(new Set(objectives.map((o) => o.id)));
    }
  }, [objectives]);

  const toggleCollapse = useCallback((objectiveId: string) => {
    setCollapsedObjectives((prev) => {
      const next = new Set(prev);
      if (next.has(objectiveId)) next.delete(objectiveId);
      else next.add(objectiveId);
      return next;
    });
  }, []);

  return { collapsedObjectives, toggleCollapse };
}
