import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { GridPage, HabitsPage, AnalyticsPage, SettingsPage } from './pages';

/**
 * Main App component with routing configuration
 * 
 * Routes:
 * - / : Grid (main habit tracking grid)
 * - /habits : Manage habits (add, edit, reorder, archive)
 * - /analytics : View statistics and trends
 * - /settings : App settings and data management
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<GridPage />} />
        <Route path="habits" element={<HabitsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
