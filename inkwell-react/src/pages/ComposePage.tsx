/**
 * ComposePage.tsx — Write a new letter on the typewriter.
 *
 * Seal flow:
 *   1. User fills title + body, clicks "Seal Letter".
 *   2. SealPicker appears — user picks design + color ('picking' phase).
 *   3. User confirms → paper becomes read-only, sound plays ('drop' phase).
 *   4. Wax seal animates down with chosen design + color.
 *   5. Paper folds ('fold' phase) and SealModal slides in.
 *   6a. User clicks "Seal & Send": navigate to /reflection with all state.
 *   6b. User clicks "Wait, I need to edit": reset to idle, paper unlocked.
 *   Cancel in picker → reset to idle, no animation.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase }        from '../lib/supabaseClient';
import { Nav }             from '../components/layout/Nav';
import { TypingArea }      from '../components/write/TypingArea';
import { MuteToggle }      from '../components/write/MuteToggle';
import { SealModal }       from '../components/write/SealModal';
import { SealPicker, getMonogram, waxGradient, WAX_COLORS } from '../components/write/SealPicker';
import { useTypewriter }   from '../hooks/useTypewriter';
import { useAudio }        from '../hooks/useAudio';
import { formatDate }      from '../lib/utils';
import type { DeliveryType, SealDesign, SealColor } from '../types/letter';
import '../styles/write.css';
import '../styles/compose.css';

type SealPhase = 'idle' | 'picking' | 'drop' | 'fold' | 'fly';

export function ComposePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const audio    = useAudio();

  // Session state passed from CoachPage (undefined when coach was skipped)
  const coachState = (location.state ?? {}) as {
    sessionId?:           string | null;
    intentSummary?:       string | null;
    structureSuggestion?: string | null;
  };

  const [title,            setTitle]            = useState('');
  const [charCount,        setCharCount]        = useState(0);
  const [error,            setError]            = useState<string | null>(null);
  const [loaded,           setLoaded]           = useState(false);
  const [sealPhase,        setSealPhase]        = useState<SealPhase>('idle');
  const [showModal,        setShowModal]        = useState(false);
  const [summaryDismissed, setSummaryDismissed] = useState(false);

  // Seal customisation — defaults match SealPicker defaults
  const [sealDesign, setSealDesign] = useState<SealDesign>('heart');
  const [sealColor,  setSealColor]  = useState<SealColor>('classic-red');

  // Monogram derived from the authenticated user's display name
  const [monogram, setMonogram] = useState('?');

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

    // Fetch display name for monogram once on mount
    supabase.auth.getUser().then(({ data }) => {
      const name =
        data.user?.user_metadata?.full_name ??
        data.user?.user_metadata?.name ??
        data.user?.email ??
        null;
      setMonogram(getMonogram(name));
    });

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

  // Step 1: user clicks "Seal Letter" — show the picker
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
    setSealPhase('picking');
  };

  // Picker cancelled — return to idle
  const handlePickerCancel = useCallback(() => {
    setSealPhase('idle');
  }, []);

  // Picker confirmed — store choices and start the animation
  const handlePickerConfirm = useCallback((design: SealDesign, color: SealColor) => {
    setSealDesign(design);
    setSealColor(color);
    beginSealAnimation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 2: drop seal, fold paper, show delivery modal
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
          title:         title.trim(),
          body:          tw.getContent(),
          deliveryType,
          specificDate,
          email,
          sealDesign,
          sealColor,
          sessionId:     coachState.sessionId     ?? null,
          intentSummary: coachState.intentSummary ?? null,
        },
      });
    }, 900);

    sealTimers.current.push(t2);
  }, [title, tw, navigate, coachState, sealDesign, sealColor]);

  // ---- Derived state ----

  const isReady      = title.trim().length > 0 && charCount > 0;
  // Hides the Seal button and locks inputs during any non-idle phase
  const isSealing    = sealPhase !== 'idle';
  // Only animate the wax seal element during drop/fold/fly
  const sealAnimating = sealPhase === 'drop' || sealPhase === 'fold' || sealPhase === 'fly';

  const sheetClass = [
    'page-sheet',
    loaded                                              ? 'sheet--loaded'  : '',
    sealPhase === 'fold' || sealPhase === 'fly'        ? 'paper--folded'  : '',
    sealPhase === 'fly'                                ? 'paper--flyaway' : '',
  ].filter(Boolean).join(' ');

  const sealClass = [
    'wax-seal',
    sealAnimating ? 'seal--drop'   : '',
    sealAnimating ? 'seal--ripple' : '',
  ].filter(Boolean).join(' ');

  // Inline style overrides the default red with the chosen wax color
  const waxSealStyle = sealAnimating ? {
    background: waxGradient(sealColor),
    '--wax-ripple': (() => {
      const c = WAX_COLORS.find(x => x.id === sealColor);
      return c ? `${c.light}66` : 'rgba(139,26,26,0.4)';
    })(),
  } as React.CSSProperties : undefined;

  // SVG path for the chosen design (undefined = monogram)
  const sealSrc =
    sealDesign === 'flower'           ? '/assets/seals/flower.svg'
    : sealDesign === 'infinity-heart' ? '/assets/seals/infinity_heart.svg'
    : sealDesign === 'floral'         ? '/assets/seals/floral.svg'
    : sealDesign === 'heart'          ? '/assets/seals/heart.svg'
    : undefined;

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

                {/* Wax seal — shows chosen design + color once animation starts */}
                <div className={sealClass} style={waxSealStyle} aria-hidden="true">
                  {sealSrc ? (
                    <img src={sealSrc} alt="" className="wax-seal-img" />
                  ) : (
                    <span className="wax-seal-monogram">{monogram}</span>
                  )}
                </div>
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

      {/* ---- Seal Picker (shown before animation, lets user choose design + color) ---- */}
      <SealPicker
        visible={sealPhase === 'picking'}
        monogram={monogram}
        onConfirm={handlePickerConfirm}
        onCancel={handlePickerCancel}
      />

      {/* ---- Seal Modal (shown at fold phase — delivery timing + email) ---- */}
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
