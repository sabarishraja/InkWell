/**
 * AuthPage.tsx — Magic Link authentication page.
 *
 * Simple email form. On submit, sends a magic link via Supabase.
 * After clicking the magic link, Supabase handles the token exchange
 * and the auth state change fires, redirecting to /vault.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Nav }                from '../components/layout/Nav';
import { useSupabaseAuth }    from '../hooks/useSupabaseAuth';

export function AuthPage() {
  const { session, signInWithMagicLink } = useSupabaseAuth();
  const navigate = useNavigate();
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (session) navigate('/vault', { replace: true });
  }, [session, navigate]);

  useEffect(() => {
    document.title = 'Sign In — Inkwell';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: err } = await signInWithMagicLink(email.trim());
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="desk-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
        }}
        aria-labelledby="auth-title"
      >
        <div className="modal-card" style={{ maxWidth: 400 }}>
          {!sent ? (
            <>
              <h1 id="auth-title" className="modal-title">Sign in to Inkwell</h1>
              <p className="modal-sub">We&rsquo;ll email you a magic link. No password needed.</p>

              <form
                onSubmit={handleSubmit}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}
                aria-label="Sign in form"
              >
                <div className="recipient-field" style={{ width: '100%' }}>
                  <label htmlFor="auth-email">Your email address</label>
                  <input
                    id="auth-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>

                {error && (
                  <p role="alert" style={{ color: '#B85C5C', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn-begin"
                  disabled={loading || !email.trim()}
                  aria-busy={loading}
                >
                  {loading ? 'Sending...' : 'Send Magic Link'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 id="auth-title" className="modal-title">Check your inbox.</h1>
              <p className="modal-sub" style={{ fontSize: 16, lineHeight: 1.6 }}>
                We sent a magic link to <strong style={{ color: 'var(--ink-gold)' }}>{email}</strong>.
                Click it to sign in.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
