import { useState } from 'react';
import { useAuth, CognitoError } from '../lib/auth';

type AuthMode = 'signin' | 'signup' | 'confirm' | 'forgot' | 'reset';

export function AuthPage() {
  const { signIn, signUp, confirmSignUp, forgotPassword, confirmForgotPassword, resendConfirmationCode } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      // Success - user state will update and redirect
    } catch (err) {
      if (err instanceof CognitoError) {
        if (err.code === 'UserNotConfirmedException') {
          setMode('confirm');
          setError('Please confirm your email first');
        } else {
          setError(err.message);
        }
      } else {
        setError('Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(email, password);
      if (result.needsConfirmation) {
        setMode('confirm');
        setMessage('Check your email for a verification code');
      }
    } catch (err) {
      if (err instanceof CognitoError) {
        setError(err.message);
      } else {
        setError('Sign up failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await confirmSignUp(email, code);
      setMode('signin');
      setMessage('Email verified! Please sign in.');
      setCode('');
    } catch (err) {
      if (err instanceof CognitoError) {
        setError(err.message);
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await forgotPassword(email);
      setMode('reset');
      setMessage('Check your email for a reset code');
    } catch (err) {
      if (err instanceof CognitoError) {
        setError(err.message);
      } else {
        setError('Request failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await confirmForgotPassword(email, code, password);
      setMode('signin');
      setMessage('Password reset! Please sign in.');
      setPassword('');
      setConfirmPassword('');
      setCode('');
    } catch (err) {
      if (err instanceof CognitoError) {
        setError(err.message);
      } else {
        setError('Reset failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setLoading(true);

    try {
      await resendConfirmationCode(email);
      setMessage('Verification code resent!');
    } catch (err) {
      setError('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Daily</h1>
          <p className="text-gray-400">Track your habits, build your future</p>
        </div>

        {/* Card */}
        <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
          {/* Title */}
          <h2 className="text-xl font-semibold text-white mb-6">
            {mode === 'signin' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'confirm' && 'Verify Email'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'reset' && 'New Password'}
          </h2>

          {/* Messages */}
          {message && (
            <div className="mb-4 p-3 bg-accent-success/20 border border-accent-success/30 rounded-lg text-accent-success text-sm">
              {message}
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-accent-error/20 border border-accent-error/30 rounded-lg text-accent-error text-sm">
              {error}
            </div>
          )}

          {/* Sign In Form */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg
                             text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg
                             text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-accent-primary hover:bg-accent-primary/80
                           disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); setMessage(null); }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
                  className="text-accent-primary hover:text-accent-primary/80 transition-colors"
                >
                  Create account
                </button>
              </div>
            </form>
          )}

          {/* Sign Up Form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg
                             text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg
                             text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
                  placeholder="••••••••"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  At least 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg
                             text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-accent-primary hover:bg-accent-primary/80
                           disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                className="w-full text-sm text-gray-400 hover:text-white transition-colors"
              >
                Already have an account? Sign in
              </button>
            </form>
          )}

          {/* Confirm Form */}
          {mode === 'confirm' && (
            <form onSubmit={handleConfirm} className="space-y-4">
              <p className="text-gray-400 text-sm mb-4">
                We sent a verification code to <strong className="text-white">{email}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Verification Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg
                             text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none
                             text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-accent-primary hover:bg-accent-primary/80
                           disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-gray-400 text-sm mb-4">
                Enter your email and we'll send you a reset code.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg
                             text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-accent-primary hover:bg-accent-primary/80
                           disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                className="w-full text-sm text-gray-400 hover:text-white transition-colors"
              >
                Back to sign in
              </button>
            </form>
          )}

          {/* Reset Password Form */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Reset Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg
                             text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none
                             text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg
                             text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg
                             text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-accent-primary hover:bg-accent-primary/80
                           disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                className="w-full text-sm text-gray-400 hover:text-white transition-colors"
              >
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
