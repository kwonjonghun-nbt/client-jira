import Layout from './components/layout/Layout';
import MainPage from './pages/MainPage';
import SettingsPage from './pages/SettingsPage';
import SyncProgress from './components/sync/SyncProgress';
import { useUIStore } from './store/uiStore';

export default function App() {
  const currentPage = useUIStore((s) => s.currentPage);

  return (
    <Layout>
      {currentPage === 'main' && <MainPage />}
      {currentPage === 'settings' && <SettingsPage />}
      <SyncProgress />
    </Layout>
  );
}
