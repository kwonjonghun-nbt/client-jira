import { create } from 'zustand';

interface Filters {
  project: string;
  status: string;
  assignee: string;
  search: string;
}

interface UIState {
  currentPage: 'main' | 'settings';
  filters: Filters;
  setPage: (page: 'main' | 'settings') => void;
  setFilter: (key: keyof Filters, value: string) => void;
  clearFilters: () => void;
}

const DEFAULT_FILTERS: Filters = {
  project: '',
  status: '',
  assignee: '',
  search: '',
};

export const useUIStore = create<UIState>((set) => ({
  currentPage: 'main',
  filters: DEFAULT_FILTERS,
  setPage: (page) => set({ currentPage: page }),
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  clearFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
