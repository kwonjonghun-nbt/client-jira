import { useCallback, useRef } from 'react';

export function useScrollSync() {
  const labelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  const syncScroll = useCallback((source: 'label' | 'chart') => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    const from = source === 'label' ? labelRef.current : scrollRef.current;
    const to = source === 'label' ? scrollRef.current : labelRef.current;
    if (from && to) to.scrollTop = from.scrollTop;
    isSyncing.current = false;
  }, []);

  return { labelRef, scrollRef, syncScroll };
}
