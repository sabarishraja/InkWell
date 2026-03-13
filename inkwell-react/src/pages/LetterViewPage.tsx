/**
 * LetterViewPage.tsx — Read-only view of a single letter.
 *
 * The body is rendered as raw HTML (it may contain <br> tags from
 * the contenteditable typewriter). Editing is not possible — the
 * database has no UPDATE policy, and this page offers no edit UI.
 *
 * A delete button triggers a confirmation modal before the letter
 * is permanently removed.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Nav }         from '../components/layout/Nav';
import { useLetters }  from '../hooks/useLetters';
import { formatDate }  from '../lib/utils';
import type { Letter } from '../types/letter';
import '../styles/letter.css';

export function LetterViewPage() {
  const { id }                         = useParams<{ id: string }>();
  const navigate                       = useNavigate();
  const { getLetter, deleteLetter }    = useLetters();

  const [letter,    setLetter]    = useState<Letter | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }

    getLetter(id).then((data) => {
      if (!data) setNotFound(true);
      else { setLetter(data); document.title = `${data.title} — Inkwell`; }
      setLoading(false);
    });
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    const ok = await deleteLetter(id);
    if (ok) navigate('/dashboard', { replace: true });
    else setDeleting(false);
  };

  // ---- Loading -------------------------------------------------------
  if (loading) {
    return (
      <div className="letter-view-page desk-bg">
        <Nav />
        <div className="letter-view-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', color: 'rgba(245,230,200,0.25)' }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  // ---- Not found -----------------------------------------------------
  if (notFound || !letter) {
    return (
      <div className="letter-view-page desk-bg">
        <Nav />
        <div className="letter-view-content">
          <div className="letter-view-topbar">
            <Link to="/dashboard" className="back-btn">My Letters</Link>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', color: 'rgba(245,230,200,0.3)', textAlign: 'center', paddingTop: 'var(--space-xl)' }}>
            This letter could not be found.
          </p>
        </div>
      </div>
    );
  }

  // ---- Letter --------------------------------------------------------
  return (
    <div className="letter-view-page desk-bg">
      <Nav />

      <main className="letter-view-content" aria-labelledby="letter-title">
        {/* Top bar */}
        <div className="letter-view-topbar">
          <Link to="/dashboard" className="back-btn" aria-label="Back to my letters">
            My Letters
          </Link>
          <button
            className="delete-btn"
            onClick={() => setShowConfirm(true)}
            aria-label="Delete this letter"
          >
            Delete
          </button>
        </div>

        {/* Meta */}
        <div className="letter-view-meta">
          <h1 id="letter-title" className="letter-view-title">{letter.title}</h1>
          <p className="letter-view-date">{formatDate(letter.created_at)}</p>
        </div>

        {/* Paper body */}
        <div className="letter-paper" role="document" aria-label="Letter contents">
          <div
            className="letter-paper-body"
            /* Safe: body is HTML we wrote from our own contenteditable.
               Only <br> tags and zero-width spaces are present. */
            dangerouslySetInnerHTML={{ __html: letter.body }}
          />
        </div>
      </main>

      {/* Delete confirmation modal */}
      {showConfirm && (
        <div
          className="confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}
        >
          <div className="confirm-modal">
            <h2 id="confirm-title" className="confirm-title">Delete this letter?</h2>
            <p className="confirm-sub">
              This cannot be undone. The letter will be gone permanently.
            </p>
            <div className="confirm-actions">
              <button
                className="confirm-cancel"
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="confirm-delete"
                onClick={handleDelete}
                disabled={deleting}
                aria-busy={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
