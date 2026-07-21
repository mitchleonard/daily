import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { seedDatabase, clearDatabase, getDatabaseStats, cloudHabitsRepository, cloudLogsRepository } from '../db';
import {
  exportAllData,
  validateImportData,
  importData,
  resetAllData,
  readFileAsText,
} from '../lib/dataPortability';
import { useAuth } from '../lib/auth';

// Only show debug panel in development mode
const isDev = import.meta.env.DEV;

interface DbStats {
  habitCount: number;
  logCount: number;
  archivedHabitCount: number;
}

type MessageType = 'success' | 'error' | 'warning';

/**
 * Reset Confirmation Modal
 * Requires typing "RESET" to confirm
 */
function ResetConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canConfirm = inputValue.toUpperCase() === 'RESET';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-dark-surface border border-accent-error/30 rounded-2xl p-6">
        <div className="text-center mb-6">
          <span className="text-4xl mb-3 block">⚠️</span>
          <h2 className="text-xl font-bold text-accent-error mb-2">Reset All Data?</h2>
          <p className="text-gray-400 text-sm">
            This will permanently delete all your habits and logs.
            This action cannot be undone.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm text-gray-300 mb-2">
            Type <span className="font-mono bg-dark-elevated px-1 rounded">RESET</span> to confirm:
          </label>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type RESET here"
            className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg
                       text-white placeholder-gray-500 focus:outline-none focus:border-accent-error
                       text-center font-mono text-lg tracking-widest"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-dark-elevated hover:bg-dark-border
                       text-gray-300 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex-1 py-3 px-4 bg-accent-error hover:bg-accent-error/80
                       disabled:opacity-30 disabled:cursor-not-allowed
                       text-white font-medium rounded-lg transition-colors"
          >
            Reset Everything
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Import Confirmation Modal
 */
function ImportConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  habitsCount,
  logsCount,
  warnings,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  habitsCount: number;
  logsCount: number;
  warnings: string[];
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-dark-surface border border-dark-border rounded-2xl p-6">
        <div className="text-center mb-6">
          <span className="text-4xl mb-3 block">📥</span>
          <h2 className="text-xl font-bold mb-2">Import Data?</h2>
          <p className="text-gray-400 text-sm">
            Add or update habits and logs from the file:
          </p>
        </div>

        <div className="bg-dark-elevated rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-accent-primary">{habitsCount}</div>
              <div className="text-xs text-gray-500">Habits</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent-success">{logsCount}</div>
              <div className="text-xs text-gray-500">Log Entries</div>
            </div>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
            <div className="text-amber-400 text-sm font-medium mb-1">⚠️ Warnings:</div>
            {warnings.map((w, i) => (
              <div key={i} className="text-amber-300/80 text-xs">{w}</div>
            ))}
          </div>
        )}

        <p className="text-sm text-gray-500 text-center mb-4">
          Your existing data will not be deleted. Matching habits and logs will be updated; new ones will be added.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-dark-elevated hover:bg-dark-border
                       text-gray-300 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 bg-accent-primary hover:bg-accent-primary/80
                       text-white font-medium rounded-lg transition-colors"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Settings Page - App configuration and data management
 */
export function SettingsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, isConfigured, signOut } = useAuth();
  
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: MessageType; text: string } | null>(null);
  
  // Modal states
  const [showResetModal, setShowResetModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    data: NonNullable<ReturnType<typeof validateImportData>['data']>;
    warnings: string[];
  } | null>(null);

  const loadStats = useCallback(async () => {
    try {
      if (user && isConfigured) {
        const [habitCount, totalHabitCount, logCount] = await Promise.all([
          cloudHabitsRepository.count(false),
          cloudHabitsRepository.count(true),
          cloudLogsRepository.count(),
        ]);
        setStats({
          habitCount,
          logCount,
          archivedHabitCount: totalHabitCount - habitCount,
        });
      } else {
        const dbStats = await getDatabaseStats();
        setStats(dbStats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, [user, isConfigured]);

  // Load stats on mount and when user changes (e.g. sign in/out)
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const showMessage = (type: MessageType, text: string) => {
    setMessage({ type, text });
    // Auto-dismiss after 5 seconds
    setTimeout(() => setMessage(null), 5000);
  };

  // ========== Export ==========
  const handleExport = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await exportAllData();
      showMessage('success', `Exported to ${result.filename}`);
    } catch (err) {
      console.error('Export failed:', err);
      showMessage('error', 'Export failed. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  // ========== Import ==========
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input for re-selection
    e.target.value = '';

    setLoading(true);
    setMessage(null);

    try {
      // Read and validate file
      const content = await readFileAsText(file);
      const validation = validateImportData(content);

      if (!validation.valid) {
        showMessage('error', 'Invalid file: ' + validation.errors.slice(0, 2).join('; '));
        setLoading(false);
        return;
      }

      // Show confirmation modal
      setPendingImport({
        data: validation.data!,
        warnings: validation.warnings,
      });
      setShowImportModal(true);
    } catch (err) {
      console.error('Import validation failed:', err);
      showMessage('error', 'Failed to read file.');
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!pendingImport) return;

    setShowImportModal(false);
    setLoading(true);

    try {
      const result = await importData(pendingImport.data);
      
      if (result.success) {
        let msg = `Imported ${result.habitsImported} habits and ${result.logsImported} logs${result.toCloud ? ' to your account' : ''}.`;
        if (result.duplicateLogsSkipped > 0) {
          msg += ` (${result.duplicateLogsSkipped} duplicates merged)`;
        }
        if (result.toCloud) {
          msg += ' If data does not appear, try a hard refresh (Cmd+Shift+R).';
        }
        showMessage('success', msg);
        await loadStats();
        setTimeout(() => navigate('/'), 1000);
      } else {
        showMessage('error', `Import failed: ${result.error}`);
      }
    } catch (err) {
      console.error('Import failed:', err);
      showMessage('error', 'Import failed unexpectedly.');
    } finally {
      setLoading(false);
      setPendingImport(null);
    }
  };

  // ========== Reset ==========
  const handleResetClick = () => {
    setShowResetModal(true);
  };

  const confirmReset = async () => {
    setShowResetModal(false);
    setLoading(true);
    setMessage(null);

    try {
      const success = await resetAllData();
      if (success) {
        showMessage('success', 'All data has been reset.');
        await loadStats();
        // Navigate to home after reset
        setTimeout(() => navigate('/'), 1000);
      } else {
        showMessage('error', 'Reset failed.');
      }
    } catch (err) {
      console.error('Reset failed:', err);
      showMessage('error', 'Reset failed unexpectedly.');
    } finally {
      setLoading(false);
    }
  };

  // ========== Dev Panel Handlers ==========
  const handleSeedData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await seedDatabase();
      showMessage('success', `Seeded ${result.habits} habits and ${result.logs} log entries!`);
      await loadStats();
    } catch (err) {
      console.error('Seed failed:', err);
      showMessage('error', 'Failed to seed data. Check console.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await clearDatabase();
      showMessage('success', 'All data cleared!');
      await loadStats();
    } catch (err) {
      console.error('Clear failed:', err);
      showMessage('error', 'Failed to clear data. Check console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container p-4 space-y-6">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold mb-1">Settings</h1>
        <p className="text-gray-400 text-sm">Manage your data and preferences</p>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-accent-success/20 text-accent-success border border-accent-success/30'
              : message.type === 'warning'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-accent-error/20 text-accent-error border border-accent-error/30'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Account Section - Only shown when Supabase is configured */}
      {isConfigured && user && (
        <div className="card">
          <h2 className="text-sm font-medium text-gray-300 mb-3">👤 Account</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">{user.email}</div>
              <div className="text-xs text-gray-500">Synced to cloud</div>
            </div>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-dark-elevated border border-dark-border
                         text-gray-300 text-sm font-medium rounded-lg 
                         hover:bg-dark-border transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Local Mode Notice - Only shown when not using cloud */}
      {!isConfigured && (
        <div className="card bg-amber-500/5 border-amber-500/20">
          <h2 className="text-sm font-medium text-amber-400 mb-2">📱 Local Mode</h2>
          <p className="text-gray-400 text-xs">
            Your data is stored locally on this device. Export regularly to keep a backup.
          </p>
        </div>
      )}

      {/* Data Statistics */}
      <div className="card">
        <h2 className="text-sm font-medium text-gray-300 mb-3">Your Data</h2>
        {stats ? (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-accent-primary">{stats.habitCount}</div>
              <div className="text-xs text-gray-500">Active Habits</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent-success">{stats.logCount}</div>
              <div className="text-xs text-gray-500">Log Entries</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-500">{stats.archivedHabitCount}</div>
              <div className="text-xs text-gray-500">Archived</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">Loading...</div>
        )}
      </div>

      {/* Export/Import Section */}
      <div className="card">
        <h2 className="text-sm font-medium text-gray-300 mb-3">📦 Backup & Restore</h2>
        <p className="text-gray-500 text-xs mb-4">
          Export your data to a JSON file for backup. Import merges habits and logs from a file without deleting existing data—ideal for bulk edits or seeding from other sources.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-accent-primary hover:bg-accent-primary/80 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Working...' : '📤 Export Data'}
          </button>
          <button
            onClick={handleImportClick}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-dark-elevated hover:bg-dark-border
                       border border-dark-border
                       disabled:opacity-50 disabled:cursor-not-allowed
                       text-gray-200 font-medium rounded-lg transition-colors"
          >
            {loading ? 'Working...' : '📥 Import Data'}
          </button>
        </div>

        <div className="mt-3 text-[10px] text-gray-600">
          Exports include all habits (including archived) and all log entries.
        </div>

        <details className="mt-3 group">
          <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-400 list-none [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform">▸</span>
              Import file format
            </span>
          </summary>
          <div className="mt-2 p-3 bg-dark-elevated rounded-lg border border-dark-border">
            <p className="text-[10px] text-gray-400 mb-2">
              The JSON file must have <code className="text-gray-300">schemaVersion: 1</code>, a{' '}
              <code className="text-gray-300">habits</code> array, and a <code className="text-gray-300">logs</code> array.
              Export a backup first to see the exact format.
            </p>
            <pre className="text-[9px] text-gray-500 overflow-x-auto font-mono whitespace-pre">
{`{
  "schemaVersion": 1,
  "habits": [
    { "id": "...", "name": "...", "icon": "📚", "color": "#f59e0b",
      "scheduleDays": "everyday", "startDate": "YYYY-MM-DD",
      "createdAt": "...", "updatedAt": "...", "archivedAt": null, "sortOrder": 0 }
  ],
  "logs": [
    { "id": "...", "habitId": "habit-id", "date": "YYYY-MM-DD",
      "status": "completed" | "skipped", "createdAt": "...", "updatedAt": "..." }
  ]
}`}
            </pre>
          </div>
        </details>
      </div>

      {/* Danger Zone */}
      <div className="card border-accent-error/20 bg-accent-error/5">
        <h2 className="text-sm font-medium text-accent-error/80 mb-3">⚠️ Danger Zone</h2>
        <p className="text-gray-500 text-xs mb-4">
          This action is permanent and cannot be undone.
        </p>
        
        <button
          onClick={handleResetClick}
          disabled={loading}
          className="w-full py-3 px-4 bg-accent-error/20 hover:bg-accent-error/30 
                     border border-accent-error/50
                     disabled:opacity-50 disabled:cursor-not-allowed
                     text-accent-error font-medium rounded-lg transition-colors"
        >
          🗑️ Reset All Data
        </button>
      </div>

      {/* Debug Panel - Only in development */}
      {isDev && (
        <div className="card border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🛠️</span>
            <h2 className="text-lg font-semibold text-amber-400">Developer Tools</h2>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Development mode only.
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleSeedData}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-accent-primary hover:bg-accent-primary/80 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-white font-medium rounded-lg transition-colors"
            >
              🌱 Seed Data
            </button>
            <button
              onClick={handleClearData}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-accent-error/20 hover:bg-accent-error/30 
                         border border-accent-error/50
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-accent-error font-medium rounded-lg transition-colors"
            >
              🗑️ Clear Data
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>• <strong>Seed</strong>: Creates 10 sample habits with 30 days of logs</p>
            <p>• <strong>Clear</strong>: Removes all data from IndexedDB</p>
          </div>
        </div>
      )}

      {/* Modals */}
      <ResetConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={confirmReset}
      />
      
      {pendingImport && (
        <ImportConfirmModal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false);
            setPendingImport(null);
          }}
          onConfirm={confirmImport}
          habitsCount={pendingImport.data.habits.length}
          logsCount={pendingImport.data.logs.length}
          warnings={pendingImport.warnings}
        />
      )}
    </div>
  );
}
