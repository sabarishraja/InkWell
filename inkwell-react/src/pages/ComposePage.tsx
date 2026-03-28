/**
 * ComposePage.tsx — Write a new letter on the typewriter.
 *
 * Seal flow:
 *   1. User fills title + body, clicks "Seal Letter".
 *   2. Wax seal drops and paper becomes read-only  ('drop' phase).
 *   3. Paper folds                                  ('fold' phase).
 *   4. SealModal slides in — user picks delivery time + recipient email.
 *   5a. User clicks "Seal & Send": letter saved to DB, edge function called
 *       for immediate delivery, paper flies away, redirect to dashboard.
 *   5b. User clicks "Wait, I need to edit": seal phases reset, paper unlocked.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Nav }          from '../components/layout/Nav';
import { TypingArea }   from '../components/write/TypingArea';
import { MuteToggle }   from '../components/write/MuteToggle';
import { SealModal }    from '../components/write/SealModal';
import { useTypewriter } from '../hooks/useTypewriter';
import { useAudio }     from '../hooks/useAudio';
import { formatDate } from '../lib/utils';
import type { DeliveryType } from '../types/letter';
import '../styles/write.css';
import '../styles/compose.css';

type SealPhase = 'idle' | 'drop' | 'fold' | 'fly';

export function ComposePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const audio    = useAudio();

  // Session state passed from CoachPage (undefined when coach was skipped)
  const coachState = (location.state ?? {}) as {
    sessionId?:          string | null;
    intentSummary?:      string | null;
    structureSuggestion?: string | null;
  };

  const [title,           setTitle]           = useState('');
  const [charCount,       setCharCount]       = useState(0);
  const [error,           setError]           = useState<string | null>(null);
  const [loaded,          setLoaded]          = useState(false);
  const [sealPhase,       setSealPhase]       = useState<SealPhase>('idle');
  const [showModal,       setShowModal]       = useState(false);
  const [summaryDismissed, setSummaryDismissed] = useState(false);

  const titleRef    = useRef<HTMLInputElement>(null);
  const bodyEnabled = useRef(false);
  const sealTimers  = useRef<ReturnType<typeof setTimeout>[]>([]);

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
    const t = setTimeout(() => setLoaded(true), 200);
    return () => {
      clearTimeout(t);
      sealTimers.current.forEach(clearTimeout);
    };
  }, []);

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

  // Begin seal animation — drops wax seal and folds paper, then shows modal
  const beginSealAnimation = useCallback(() => {
    tw.setReadOnly(true);
    setSealPhase('drop');
    audio.playPaperTear();

    const t1 = setTimeout(() => {
      setSealPhase('fold');
      setShowModal(true);
    }, 650);

    sealTimers.current = [t1];
  }, [tw, audio]);

  // Cancel from the modal — reverse the seal animation
  const handleModalCancel = useCallback(() => {
    setShowModal(false);
    setSealPhase('idle');
    tw.setReadOnly(false);
    sealTimers.current.forEach(clearTimeout);
    sealTimers.current = [];
  }, [tw]);

  // Submit from the modal — fly the paper away, then hand off to /reflection
  const handleModalSend = useCallback(({
    deliveryType,
    specificDate,
    email,
  }: {
    deliveryType: DeliveryType;
    specificDate?: string;
    email: string;
  }) => {
    setShowModal(false);
    setSealPhase('fly');

    const t2 = setTimeout(() => {
      navigate('/reflection', {
        replace: true,
        state: {
          title:          title.trim(),
          body:           tw.getContent(),
          deliveryType,
          specificDate,
          email,
          sessionId:      coachState.sessionId     ?? null,
          intentSummary:  coachState.intentSummary ?? null,
        },
      });
    }, 900);

    sealTimers.current.push(t2);
  }, [title, tw, navigate, coachState]);

  const handleSealClick = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      titleRef.current?.focus();
      setError('Please add a title before sealing.');
      return;
    }
    if (tw.getCharCount() === 0) {
      enableBody();
      setError('Write something before sealing.');
      return;
    }
    setError(null);
    beginSealAnimation();
  };

  const isReady   = title.trim().length > 0 && charCount > 0;
  const isSealing = sealPhase !== 'idle';

  const sheetClass = [
    'page-sheet',
    loaded                                              ? 'sheet--loaded'  : '',
    sealPhase === 'fold' || sealPhase === 'fly'        ? 'paper--folded'  : '',
    sealPhase === 'fly'                                ? 'paper--flyaway' : '',
  ].filter(Boolean).join(' ');

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
            disabled={isSealing}
          />
        </div>

        {/* ---- Coach summary (shown when coming from /coach) ---- */}
        {coachState.intentSummary && !summaryDismissed && (
          <div className="coach-kickstarter" role="note" aria-label="Your writing intention">
            <div className="coach-kickstarter__label">Before you write</div>
            <p className="coach-kickstarter__intent">{coachState.intentSummary}</p>
            {coachState.structureSuggestion && (
              <p className="coach-kickstarter__suggestion">{coachState.structureSuggestion}</p>
            )}
            <button
              className="coach-kickstarter__dismiss"
              onClick={() => setSummaryDismissed(true)}
              aria-label="Dismiss writing intention"
            >
              dismiss
            </button>
          </div>
        )}

        {/* ---- Paper (typewriter frame + paper sheet) ---- */}
        <div
          className="compose-paper-area"
          onClick={isSealing ? undefined : enableBody}
          role="presentation"
        >
          <div className="typewriter-frame">
            <div className="paper-guide" aria-hidden="true">
              <div className="paper-slot" />
            </div>

            <div className="pages-container">
              <div className={sheetClass}>
                <div className="paper paper-parchment">
                  <div className="paper-lines" aria-hidden="true" />

                  <div className="paper-date date--visible" aria-hidden="true">
                    {formatDate(new Date())}
                  </div>

                  <TypingArea
                    typingAreaRef={tw.typingAreaRef}
                    cursorRef={tw.cursorRef}
                    marginFlashRef={tw.marginFlashRef}
                    carriageSweepRef={tw.carriageSweepRef}
                    bellWarnRef={tw.bellWarnRef}
                    inkColor="sepia"
                    fontSize="normal"
                  />
                </div>

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

        {/* ---- Seal button ---- */}
        {!isSealing && (
          <button
            className={`save-btn ${isReady ? 'save-btn--ready' : ''}`}
            onClick={handleSealClick}
            disabled={!isReady}
            aria-label="Seal and send this letter"
          >
            Seal Letter
          </button>
        )}

      </main>

      {/* ---- Seal Modal (shown at fold phase) ---- */}
      <SealModal
        visible={showModal}
        sending={false}
        onSend={handleModalSend}
        onCancel={handleModalCancel}
      />

      <MuteToggle audio={audio} />
    </div>
  );
}
