/**
 * ComposePage.tsx — Write a new letter on the typewriter.
 *
 * Layout:
 *   1. Title input  — typewriter-styled, fills in first.
 *   2. Paper area   — contenteditable body with full typewriter mechanics
 *                     (key clacks, carriage return sound, custom cursor).
 *   3. Save button  — enabled once both title and body are non-empty.
 *                     On save, wax seal animation plays then user is
 *                     redirected to /dashboard.
 *
 * The paper body becomes active when the user presses Enter/Tab in the title
 * or clicks anywhere on the paper. Typing is disabled in the paper until
 * then so focus is not stolen while the user fills in the title.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Nav }          from '../components/layout/Nav';
import { TypingArea }   from '../components/write/TypingArea';
import { MuteToggle }   from '../components/write/MuteToggle';
import { useTypewriter } from '../hooks/useTypewriter';
import { useAudio }     from '../hooks/useAudio';
import { useLetters }   from '../hooks/useLetters';
import { formatDate }   from '../lib/utils';
import '../styles/write.css';
import '../styles/compose.css';

type SealPhase = 'idle' | 'drop' | 'fold' | 'fly';

export function ComposePage() {
  const navigate = useNavigate();
  const audio    = useAudio();
  const { createLetter, error: letters_error } = useLetters();

  const [title,     setTitle]     = useState('');
  const [charCount, setCharCount] = useState(0);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [loaded,    setLoaded]    = useState(false);
  const [sealPhase, setSealPhase] = useState<SealPhase>('idle');

  const titleRef    = useRef<HTMLInputElement>(null);
  const bodyEnabled = useRef(false);
  const sealTimers  = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Typewriter hook — body will be enabled manually (not via PaperSheet)
  const tw = useTypewriter({
    audio,
    onContentChange: () => {
      setCharCount(tw.getCharCount());
    },
    onLineThresholdReached: () => {
      tw.resetThreshold();
    },
  });

  useEffect(() => {
    document.title = 'Compose — Inkwell';
    // Animate paper slide-in
    const t = setTimeout(() => setLoaded(true), 200);
    return () => {
      clearTimeout(t);
      sealTimers.current.forEach(clearTimeout);
    };
  }, []);

  // Enable the typewriter body and move focus into it
  const enableBody = useCallback(() => {
    if (!bodyEnabled.current) {
      bodyEnabled.current = true;
      tw.enable();
    }
  }, [tw]);

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      enableBody();
    }
  };

  const triggerSealAndNavigate = useCallback(() => {
    // 1. Lock typewriter and drop seal
    tw.setReadOnly(true);
    setSealPhase('drop');
    audio.playPaperTear();

    const t1 = setTimeout(() => {
      // 2. Paper folds
      setSealPhase('fold');
    }, 650);

    const t2 = setTimeout(() => {
      // 3. Paper flies away
      setSealPhase('fly');
    }, 1250);

    const t3 = setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 2100);

    sealTimers.current = [t1, t2, t3];
  }, [tw, audio, navigate]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      titleRef.current?.focus();
      setError('Please add a title before saving.');
      return;
    }
    if (tw.getCharCount() === 0) {
      enableBody();
      setError('Write something before saving.');
      return;
    }

    setError(null);
    setSaving(true);

    const saved = await createLetter({ title: trimmedTitle, body: tw.getContent() });
    setSaving(false);

    if (saved) {
      triggerSealAndNavigate();
    } else {
      setError(letters_error || 'Something went wrong. Please try again.');
    }
  };

  const isReady    = title.trim().length > 0 && charCount > 0;
  const isSealing  = sealPhase !== 'idle';

  // Page-sheet CSS classes based on seal phase
  const sheetClass = [
    'page-sheet',
    loaded    ? 'sheet--loaded' : '',
    sealPhase === 'fold' || sealPhase === 'fly' ? 'paper--folded' : '',
    sealPhase === 'fly'  ? 'paper--flyaway'     : '',
  ].filter(Boolean).join(' ');

  // Wax seal CSS classes
  const sealClass = [
    'wax-seal',
    isSealing ? 'seal--drop'   : '',
    isSealing ? 'seal--ripple' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="compose-page desk-bg">
      <Nav />

      <main className="compose-desk" aria-label="Letter composition area">

        {/* ---- Title ---- */}
        <div className="compose-title-wrap">
          <input
            ref={titleRef}
            className="compose-title-input"
            type="text"
            placeholder="Title your letter…"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(null); }}
            onKeyDown={handleTitleKeyDown}
            autoFocus
            autoComplete="off"
            aria-label="Letter title"
            disabled={saving || isSealing}
          />
        </div>

        {/* ---- Paper (typewriter frame + paper sheet) ---- */}
        <div
          className="compose-paper-area"
          onClick={isSealing ? undefined : enableBody}
          role="presentation"
        >
          <div className="typewriter-frame">
            {/* Chrome paper guide */}
            <div className="paper-guide" aria-hidden="true">
              <div className="paper-slot" />
            </div>

            {/* Paper sheet */}
            <div className="pages-container">
              <div className={sheetClass}>
                <div className="paper paper-parchment">
                  <div className="paper-lines" aria-hidden="true" />

                  {/* Date — top right of page */}
                  <div className="paper-date date--visible" aria-hidden="true">
                    {formatDate(new Date())}
                  </div>

                  {/* Typewriter typing area */}
                  <TypingArea
                    typingAreaRef={tw.typingAreaRef}
                    cursorRef={tw.cursorRef}
                    marginFlashRef={tw.marginFlashRef}
                    carriageSweepRef={tw.carriageSweepRef}
                    inkColor="sepia"
                    fontSize="normal"
                  />
                </div>

                {/* Wax seal — appears on save */}
                <div className={sealClass} aria-hidden="true">✦</div>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Hints + error ---- */}
        {!isSealing && (
          <p className="compose-hint" aria-hidden="true">
            [ ENTER ] New line &nbsp;|&nbsp; [ BACKSPACE ] Delete
          </p>
        )}

        {error && (
          <p className="compose-error" role="alert">{error}</p>
        )}

        {/* ---- Save button ---- */}
        {!isSealing && (
          <button
            className={`save-btn ${isReady ? 'save-btn--ready' : ''}`}
            onClick={handleSave}
            disabled={saving || !isReady}
            aria-label="Save letter"
            aria-busy={saving}
          >
            {saving ? 'Saving…' : 'Save Letter'}
          </button>
        )}

      </main>

      <MuteToggle audio={audio} />
    </div>
  );
}
