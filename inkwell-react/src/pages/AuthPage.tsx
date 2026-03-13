/**
 * AuthPage.tsx — Email + password authentication.
 *
 * Four modes, all rendered at /auth:
 *   signin      — default, sign in with email + password
 *   signup      — create a new account
 *   reset       — request a password reset email
 *   newpassword — set a new password (shown after clicking the reset email link)
 *
 * Logged-in users are immediately redirected to /dashboard.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Nav }               from '../components/layout/Nav';
import { useSupabaseAuth }   from '../hooks/useSupabaseAuth';
import '../styles/write.css';  // provides modal-card, btn-begin, recipient-field, etc.
import '../styles/auth.css';

type Mode = 'signin' | 'signup' | 'reset' | 'newpassword';

export function AuthPage() {
  const navigate = useNavigate();
  const {
    session,
    isPasswordRecovery,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
  } = useSupabaseAuth();

  const [mode,     setMode]     = useState<Mode>('signin');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [notice,   setNotice]   = useState<string | null>(null);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (session && !isPasswordRecovery) navigate('/dashboard', { replace: true });
  }, [session, isPasswordRecovery, navigate]);

  // Switch to new-password mode when the recovery token is detected
  useEffect(() => {
    if (isPasswordRecovery) setMode('newpassword');
  }, [isPasswordRecovery]);

  useEffect(() => {
    document.title = 'Sign In — Inkwell';
  }, []);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirm('');
    setError(null);
    setNotice(null);
  };

  const switchMode = (next: Mode) => {
    resetForm();
    setMode(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'newpassword' && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error: err } = await signIn(email.trim(), password);
        if (err) { setError(err); return; }
        navigate('/dashboard', { replace: true });

      } else if (mode === 'signup') {
        const { error: err, needsConfirmation } = await signUp(email.trim(), password);
        if (err) { setError(err); return; }
        if (needsConfirmation) {
          setNotice(`We sent a confirmation link to ${email.trim()}. Please check your inbox and confirm your email before signing in.`);
          switchMode('signin');
        } else {
          navigate('/dashboard', { replace: true });
        }

      } else if (mode === 'reset') {
        const { error: err } = await resetPassword(email.trim());
        if (err) { setError(err); return; }
        setNotice(`A password reset link has been sent to ${email.trim()}.`);

      } else if (mode === 'newpassword') {
        const { error: err } = await updatePassword(password);
        if (err) { setError(err); return; }
        navigate('/dashboard', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  // ---- Render -------------------------------------------------------

  const titles: Record<Mode, string> = {
    signin:      'Sign in to Inkwell',
    signup:      'Create an account',
    reset:       'Reset your password',
    newpassword: 'Set a new password',
  };

  const buttonLabels: Record<Mode, string> = {
    signin:      loading ? 'Signing in…'  : 'Sign In',
    signup:      loading ? 'Creating…'    : 'Create Account',
    reset:       loading ? 'Sending…'     : 'Send Reset Link',
    newpassword: loading ? 'Updating…'    : 'Set New Password',
  };

  return (
    <div className="auth-page desk-bg">
      <Nav />

      <main className="auth-main" aria-labelledby="auth-title">
        <div className="modal-card" style={{ maxWidth: 400 }}>
          <h1 id="auth-title" className="modal-title">{titles[mode]}</h1>

          {/* ---- Notice (e.g. "check your email") ---- */}
          {notice && (
            <p className="auth-notice" role="status">
              {notice}
            </p>
          )}

          {/* ---- Form ---- */}
          {!notice && (
            <form className="auth-form" onSubmit={handleSubmit} aria-label="Authentication form" noValidate>

              {/* Email field (all modes except newpassword) */}
              {mode !== 'newpassword' && (
                <div className="recipient-field" style={{ width: '100%' }}>
                  <label htmlFor="auth-email">Email address</label>
                  <input
                    id="auth-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              )}

              {/* Password field (signin, signup, newpassword) */}
              {mode !== 'reset' && (
                <div className="recipient-field" style={{ width: '100%' }}>
                  <label htmlFor="auth-password">
                    {mode === 'newpassword' ? 'New password' : 'Password'}
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus={mode === 'newpassword'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    disabled={loading}
                    minLength={6}
                  />
                </div>
              )}

              {/* Confirm password (signup, newpassword) */}
              {(mode === 'signup' || mode === 'newpassword') && (
                <div className="recipient-field" style={{ width: '100%' }}>
                  <label htmlFor="auth-confirm">Confirm password</label>
                  <input
                    id="auth-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>
              )}

              {/* Forgot password link (signin only) */}
              {mode === 'signin' && (
                <button
                  type="button"
                  className="forgot-link"
                  onClick={() => switchMode('reset')}
                >
                  Forgot your password?
                </button>
              )}

              {/* Inline error */}
              {error && (
                <p className="auth-error" role="alert">{error}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="btn-begin"
                disabled={loading}
                aria-busy={loading}
              >
                {buttonLabels[mode]}
              </button>
            </form>
          )}

          {/* ---- Mode toggle ---- */}
          {mode === 'signin' && (
            <p className="auth-toggle">
              Don&rsquo;t have an account?{' '}
              <button type="button" className="auth-link" onClick={() => switchMode('signup')}>
                Sign up
              </button>
            </p>
          )}
          {mode === 'signup' && (
            <p className="auth-toggle">
              Already have an account?{' '}
              <button type="button" className="auth-link" onClick={() => switchMode('signin')}>
                Sign in
              </button>
            </p>
          )}
          {(mode === 'reset' || notice) && (
            <button type="button" className="auth-back" onClick={() => switchMode('signin')}>
              ← Back to sign in
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
