import { lazy, Suspense, useMemo } from 'react';
import Layout from './components/layout/Layout';
import SyncProgress from './components/sync/SyncProgress';
import IssueDetailModal from './components/issue/IssueDetailModal';
import AITaskPanel from './components/ai-tasks/AITaskPanel';
import AITaskDetailModal from './components/ai-tasks/AITaskDetailModal';
import { useUIStore } from './store/uiStore';
import { useAITaskListener } from './hooks/useAITaskListener';
import { useJiraIssues } from './hooks/useJiraIssues';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MainPage = lazy(() => import('./pages/MainPage'));
const TimelinePage = lazy(() => import('./pages/TimelinePage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const LabelNotesPage = lazy(() => import('./pages/LabelNotesPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const OKRPage = lazy(() => import('./pages/OKRPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export default function App() {
  const currentPage = useUIStore((s) => s.currentPage);
  const selectedIssueKey = useUIStore((s) => s.selectedIssueKey);
  const issueBaseUrl = useUIStore((s) => s.issueBaseUrl);
  const closeIssueDetail = useUIStore((s) => s.closeIssueDetail);
  const { data } = useJiraIssues();
  useAITaskListener();

  const selectedIssue = useMemo(() => {
    if (!selectedIssueKey || !data?.issues) return null;
    return data.issues.find((i) => i.key === selectedIssueKey) ?? null;
  }, [selectedIssueKey, data?.issues]);

  return (
    <Layout>
      <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-gray-400 text-sm">Loading...</div></div>}>
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'main' && <MainPage />}
        {currentPage === 'timeline' && <TimelinePage />}
        {currentPage === 'stats' && <StatsPage />}
        {currentPage === 'label-notes' && <LabelNotesPage />}
        {currentPage === 'reports' && <ReportsPage />}
        {currentPage === 'okr' && <OKRPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </Suspense>
      <SyncProgress />
      {selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          baseUrl={issueBaseUrl}
          onClose={closeIssueDetail}
        />
      )}
      <AITaskPanel />
      <AITaskDetailModal />
    </Layout>
  );
}
