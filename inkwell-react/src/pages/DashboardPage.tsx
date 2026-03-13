/**
 * DashboardPage.tsx — The user's letters vault.
 *
 * Lists all letters newest-first. Each item links to the read-only view.
 * A Compose button navigates to /compose.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Nav }            from '../components/layout/Nav';
import { useLetters }     from '../hooks/useLetters';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { formatDate }     from '../lib/utils';
import '../styles/dashboard.css';

export function DashboardPage() {
  const { letters, loading, error, fetchLetters } = useLetters();
  useScrollReveal();

  useEffect(() => {
    document.title = 'My Letters — Inkwell';
    fetchLetters();
  }, []);

  return (
    <div className="dashboard-page desk-bg">
      <Nav />

      <main className="dashboard-content" aria-labelledby="dashboard-title">
        <header className="dashboard-header" data-animate>
          <h1 id="dashboard-title" className="dashboard-title">
            Your Letters
          </h1>
          <Link to="/compose" className="compose-btn" aria-label="Compose a new letter">
            Compose
          </Link>
        </header>

        {error && (
          <p style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', color: '#c47070', textAlign: 'center', paddingTop: 'var(--space-xl)' }}>
            {error}
          </p>
        )}

        {loading ? (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontStyle: 'italic',
              color: 'rgba(245,230,200,0.25)',
              textAlign: 'center',
              paddingTop: 'var(--space-xl)',
            }}
            role="status"
          >
            Loading…
          </p>
        ) : letters.length === 0 ? (
          <div className="letters-empty" role="status">
            <div className="letters-empty__icon" aria-hidden="true">✉</div>
            <p className="letters-empty__text">
              Nothing here yet.<br />
              Write your first letter.
            </p>
          </div>
        ) : (
          <ul className="letters-list" role="list" aria-label="Your letters">
            {letters.map((letter) => (
              <li key={letter.id}>
                <Link
                  to={`/letter/${letter.id}`}
                  className="letter-item"
                  aria-label={`${letter.title} — written ${formatDate(letter.created_at)}`}
                >
                  <div className="letter-item__body">
                    <div className="letter-item__title">{letter.title}</div>
                    <div className="letter-item__date">{formatDate(letter.created_at)}</div>
                  </div>
                  <span className="letter-item__arrow" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
