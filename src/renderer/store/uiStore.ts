import { create } from 'zustand';

interface Filters {
  project: string;
  statuses: string[];
  assignee: string;
  search: string;
}

type Page = 'main' | 'settings' | 'timeline' | 'stats';

interface UIState {
  currentPage: Page;
  filters: Filters;
  setPage: (page: Page) => void;
  setFilter: (key: 'project' | 'assignee' | 'search', value: string) => void;
  toggleStatus: (status: string) => void;
  clearFilters: () => void;
}

const DEFAULT_FILTERS: Filters = {
  project: '',
  statuses: [],
  assignee: '',
  search: '',
};

export const useUIStore = create<UIState>((set) => ({
  currentPage: 'main',
  filters: DEFAULT_FILTERS,
  setPage: (page) => set({ currentPage: page }),
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  toggleStatus: (status) =>
    set((state) => {
      const current = state.filters.statuses;
      const next = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      return { filters: { ...state.filters, statuses: next } };
    }),
  clearFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
