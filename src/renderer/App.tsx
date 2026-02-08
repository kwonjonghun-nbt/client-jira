import Layout from './components/layout/Layout';
import MainPage from './pages/MainPage';
import SettingsPage from './pages/SettingsPage';
import TimelinePage from './pages/TimelinePage';
import StatsPage from './pages/StatsPage';
import LabelNotesPage from './pages/LabelNotesPage';
import ReportsPage from './pages/ReportsPage';
import DashboardPage from './pages/DashboardPage';
import SyncProgress from './components/sync/SyncProgress';
import IssueDetailModal from './components/issue/IssueDetailModal';
import { useUIStore } from './store/uiStore';

export default function App() {
  const currentPage = useUIStore((s) => s.currentPage);

  return (
    <Layout>
      {currentPage === 'dashboard' && <DashboardPage />}
      {currentPage === 'main' && <MainPage />}
      {currentPage === 'timeline' && <TimelinePage />}
      {currentPage === 'stats' && <StatsPage />}
      {currentPage === 'label-notes' && <LabelNotesPage />}
      {currentPage === 'reports' && <ReportsPage />}
      {currentPage === 'settings' && <SettingsPage />}
      <SyncProgress />
      <IssueDetailModal />
    </Layout>
  );
}
