import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type AuthMode = 'signin' | 'signup';

export function AuthPage() {
  const location = useLocation();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>(() => location.pathname === '/signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'signup' && password !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setMessage('Check your email to confirm your account, then sign in with this password.');
      }
    } catch (caught) {
      const errorMessage = caught instanceof Error ? caught.message : 'Unable to complete sign-in.';
      setError(mode === 'signin' && /invalid login credentials/i.test(errorMessage) ? 'Email or password was incorrect.' : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Daily</h1>
          <p className="text-gray-400">Track your habits, build your future</p>
        </div>
        <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            {mode === 'signin' ? 'Use your Daily email and password.' : 'Create a password to use on every device.'}
          </p>
          {message && <div className="mb-4 p-3 bg-accent-success/20 border border-accent-success/30 rounded-lg text-accent-success text-sm">{message}</div>}
          {error && <div className="mb-4 p-3 bg-accent-error/20 border border-accent-error/30 rounded-lg text-accent-error text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
                  placeholder="Repeat your password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
              {loading ? 'Signing in…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setPassword(''); setConfirmPassword(''); setError(null); setMessage(null); }}
            className="mt-4 w-full text-sm text-gray-400 hover:text-white transition-colors"
          >
            {mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
