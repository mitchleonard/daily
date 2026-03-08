import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { GridPage, HabitsPage, AnalyticsPage, SettingsPage, AuthPage, SplashPage } from './pages';
import { AuthProvider, useAuth } from './lib/auth';

/**
 * Protected route wrapper - shows auth page if not logged in
 */
function ProtectedApp() {
  const { user, loading, isConfigured } = useAuth();

  // If AWS is not configured, show splash/auth at root for local preview
  // App (grid, habits, etc.) lives at /app
  if (!isConfigured) {
    return (
      <Routes>
        <Route path="/" element={<SplashPage />} />
        <Route path="/signup" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/app" element={<Layout basePath="/app" />}>
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

  // Show splash and auth routes if not logged in
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<SplashPage />} />
        <Route path="/signup" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
      </Routes>
    );
  }

  // Show main app (redirect /signup and /login to app when logged in)
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<GridPage />} />
        <Route path="habits" element={<HabitsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/signup" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
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
