import { create } from 'zustand';
import type { NormalizedIssue } from '../types/jira.types';

interface Filters {
  project: string;
  statuses: string[];
  assignee: string;
  search: string;
}

type Page = 'dashboard' | 'main' | 'settings' | 'timeline' | 'stats' | 'label-notes' | 'reports' | 'okr';

export type SettingsSection = 'jira' | 'collection' | 'schedule' | 'storage' | 'slack' | 'email' | 'ai' | 'update' | null;

interface UIState {
  currentPage: Page;
  sidebarExpanded: boolean;
  filters: Filters;
  selectedIssue: NormalizedIssue | null;
  issueBaseUrl: string | null;
  settingsSection: SettingsSection;
  toggleSidebar: () => void;
  setPage: (page: Page) => void;
  setFilter: (key: 'project' | 'assignee' | 'search', value: string) => void;
  toggleStatus: (status: string) => void;
  clearFilters: () => void;
  openIssueDetail: (issue: NormalizedIssue, baseUrl?: string) => void;
  closeIssueDetail: () => void;
  setSettingsSection: (section: SettingsSection) => void;
}

const DEFAULT_FILTERS: Filters = {
  project: '',
  statuses: [],
  assignee: '',
  search: '',
};

export const useUIStore = create<UIState>((set) => ({
  currentPage: 'dashboard',
  sidebarExpanded: false,
  filters: DEFAULT_FILTERS,
  selectedIssue: null,
  issueBaseUrl: null,
  toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
  settingsSection: null,
  setPage: (page) => set({ currentPage: page, settingsSection: null }),
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
  openIssueDetail: (issue, baseUrl) => set({ selectedIssue: issue, issueBaseUrl: baseUrl ?? null }),
  closeIssueDetail: () => set({ selectedIssue: null, issueBaseUrl: null }),
}));
