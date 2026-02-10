import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { GridPage, HabitsPage, AnalyticsPage, SettingsPage, AuthPage } from './pages';
import { AuthProvider, useAuth, isAwsConfigured } from './lib/auth';

/**
 * Protected route wrapper - shows auth page if not logged in
 */
function ProtectedApp() {
  const { user, loading, isConfigured } = useAuth();

  // If AWS is not configured, show app in local-only mode
  if (!isConfigured) {
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

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  // Show main app
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
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
}

export default App;
