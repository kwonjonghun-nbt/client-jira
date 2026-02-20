import { lazy, Suspense } from 'react';
import Layout from './components/layout/Layout';
import SyncProgress from './components/sync/SyncProgress';
import IssueDetailModal from './components/issue/IssueDetailModal';
import AITaskPanel from './components/ai-tasks/AITaskPanel';
import AITaskDetailModal from './components/ai-tasks/AITaskDetailModal';
import { useUIStore } from './store/uiStore';
import { useAITaskListener } from './hooks/useAITaskListener';

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
  useAITaskListener();

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
      <IssueDetailModal />
      <AITaskPanel />
      <AITaskDetailModal />
    </Layout>
  );
}
