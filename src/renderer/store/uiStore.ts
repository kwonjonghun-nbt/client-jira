import { create } from 'zustand';

interface Filters {
  project: string;
  statuses: string[];
  assignee: string;
  search: string;
}

type Page = 'dashboard' | 'main' | 'settings' | 'timeline' | 'stats' | 'label-notes' | 'reports' | 'okr';

export type SettingsSection = 'jira' | 'collection' | 'schedule' | 'storage' | 'slack' | 'email' | 'ai' | 'update' | null;

interface ConfirmDialogState {
  title: string;
  message: string;
  onConfirm: () => void;
}

type PageFilters = Partial<Record<Page, Filters>>;

interface UIState {
  currentPage: Page;
  sidebarExpanded: boolean;
  filters: Filters;
  pageFilters: PageFilters;
  selectedIssueKey: string | null;
  issueBaseUrl: string | null;
  settingsSection: SettingsSection;
  confirmDialog: ConfirmDialogState | null;
  toggleSidebar: () => void;
  setPage: (page: Page) => void;
  setFilter: (key: 'project' | 'assignee' | 'search', value: string) => void;
  toggleStatus: (status: string) => void;
  clearFilters: () => void;
  openIssueDetail: (issueKey: string, baseUrl?: string) => void;
  closeIssueDetail: () => void;
  setSettingsSection: (section: SettingsSection) => void;
  showConfirm: (opts: ConfirmDialogState) => void;
  closeConfirm: () => void;
}

const DEFAULT_FILTERS: Filters = {
  project: '',
  statuses: [],
  assignee: '',
  search: '',
};

export const useUIStore = create<UIState>((set) => ({
  currentPage: 'dashboard',
  sidebarExpanded: true,
  filters: DEFAULT_FILTERS,
  pageFilters: {},
  selectedIssueKey: null,
  issueBaseUrl: null,
  confirmDialog: null,
  toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
  settingsSection: null,
  setPage: (page) =>
    set((state) => ({
      currentPage: page,
      settingsSection: null,
      pageFilters: { ...state.pageFilters, [state.currentPage]: state.filters },
      filters: state.pageFilters[page] ?? DEFAULT_FILTERS,
    })),
  setSettingsSection: (section) => set({ settingsSection: section }),
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
  openIssueDetail: (issueKey, baseUrl) => set({ selectedIssueKey: issueKey, issueBaseUrl: baseUrl ?? null }),
  closeIssueDetail: () => set({ selectedIssueKey: null, issueBaseUrl: null }),
  showConfirm: (opts) => set({ confirmDialog: opts }),
  closeConfirm: () => set({ confirmDialog: null }),
}));
