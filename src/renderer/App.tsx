import Layout from './components/layout/Layout';
import MainPage from './pages/MainPage';
import SettingsPage from './pages/SettingsPage';
import TimelinePage from './pages/TimelinePage';
import StatsPage from './pages/StatsPage';
import LabelNotesPage from './pages/LabelNotesPage';
import ReportsPage from './pages/ReportsPage';
import OKRPage from './pages/OKRPage';
import DashboardPage from './pages/DashboardPage';
import SyncProgress from './components/sync/SyncProgress';
import IssueDetailModal from './components/issue/IssueDetailModal';
import FloatingAIButton from './components/ai-tasks/FloatingAIButton';
import AITaskPanel from './components/ai-tasks/AITaskPanel';
import AITaskDetailModal from './components/ai-tasks/AITaskDetailModal';
import { useUIStore } from './store/uiStore';
import { useAITaskListener } from './hooks/useAITaskListener';

export default function App() {
  const currentPage = useUIStore((s) => s.currentPage);
  useAITaskListener();

  return (
    <Layout>
      {currentPage === 'dashboard' && <DashboardPage />}
      {currentPage === 'main' && <MainPage />}
      {currentPage === 'timeline' && <TimelinePage />}
      {currentPage === 'stats' && <StatsPage />}
      {currentPage === 'label-notes' && <LabelNotesPage />}
      {currentPage === 'reports' && <ReportsPage />}
      {currentPage === 'okr' && <OKRPage />}
      {currentPage === 'settings' && <SettingsPage />}
      <SyncProgress />
      <IssueDetailModal />
      <FloatingAIButton />
      <AITaskPanel />
      <AITaskDetailModal />
    </Layout>
  );
}
