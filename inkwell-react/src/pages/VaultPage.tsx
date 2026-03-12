/**
 * VaultPage.tsx — The user's sealed letters vault.
 *
 * Loads letters from Supabase, renders filterable card list.
 * Filters: All / Sealed / Delivered.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/vault.css';
import { Nav }        from '../components/layout/Nav';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useLetters } from '../hooks/useLetters';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { formatDate, calcProgress } from '../lib/utils';
import type { Letter } from '../types/letter';

type Filter = 'all' | 'sealed' | 'delivered';

export function VaultPage() {
  const { letters, loading, fetchLetters } = useLetters();
  const [filter, setFilter] = useState<Filter>('all');
  useScrollReveal();

  useEffect(() => {
    document.title = 'My Vault — Inkwell';
    fetchLetters();
  }, []);

  const filtered = letters.filter((l) => {
    if (filter === 'all')       return true;
    if (filter === 'sealed')    return l.status === 'sealed';
    if (filter === 'delivered') return l.status === 'delivered' || l.status === 'opened';
    return true;
  });

  return (
    <div className="desk-bg vault-page">
      <Nav />

      <main className="vault-content" aria-labelledby="vault-title">
        {/* Header */}
        <header className="vault-header">
          <h1 id="vault-title" className="vault-title" data-animate>
            Your Letters
          </h1>
          <p className="vault-subtitle" data-animate data-delay="1">
            Sealed, waiting, delivered.
          </p>
        </header>

        {/* Tab filters */}
        <div
          className="vault-tabs"
          role="tablist"
          aria-label="Filter letters by status"
        >
          {(['all', 'sealed', 'delivered'] as Filter[]).map((f) => (
            <button
              key={f}
              className={`vault-tab ${filter === f ? 'tab--active' : ''}`}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Cards list */}
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(245,230,200,0.3)', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
            Loading your letters...
          </p>
        ) : filtered.length === 0 ? (
          <div className="vault-empty" role="status">
            <p>No letters yet. Write one.</p>
            <Link to="/write" aria-label="Write a new letter">
              Write one →
            </Link>
          </div>
        ) : (
          <ul className="vault-cards" role="list" aria-label="Your letters">
            {filtered.map((letter) => (
              <li key={letter.id} data-animate>
                <LetterCard letter={letter} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

// ---- LetterCard subcomponent ----------------------------------------

function LetterCard({ letter }: { letter: Letter }) {
  const progress = calcProgress(letter.created_at, letter.deliver_at);
  const isDelivered = letter.status === 'delivered' || letter.status === 'opened';

  const deliveryLabel = isDelivered
    ? `Arrived — ${formatDate(letter.deliver_at)}`
    : `Arriving — ${formatDate(letter.deliver_at)}`;

  return (
    <Link
      to={`/letter/${letter.id}`}
      className="letter-card"
      aria-label={`Letter for ${letter.recipient_name || 'recipient'} — ${letter.status}`}
    >
      {/* Top row: recipient + status badge */}
      <div className="card-top">
        <span className="card-recipient">
          {letter.recipient_name ? `For ${letter.recipient_name}` : 'Unnamed recipient'}
        </span>
        <StatusBadge status={letter.status} />
      </div>

      {/* Meta row: written + delivery dates */}
      <div className="card-meta">
        <span className="card-meta-item">
          Written &mdash; <strong>{formatDate(letter.created_at)}</strong>
        </span>
        <span className="card-meta-item">
          <strong>{deliveryLabel}</strong>
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="card-progress"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Delivery progress: ${progress}%`}
        style={{ '--progress': `${progress}%` } as React.CSSProperties}
      >
        <div className="card-progress__fill" />
        {!isDelivered && <div className="card-progress__dot" />}
      </div>
    </Link>
  );
}
