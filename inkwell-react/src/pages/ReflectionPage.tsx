/**
 * ReflectionPage.tsx — Post-writing intent reflection.
 *
 * Full-screen transitional screen shown AFTER "Seal Letter" (and after the
 * SealModal where delivery + email are chosen) but BEFORE the letter is
 * saved to the database.
 *
 * Receives via React Router state (location.state):
 *   title:           string
 *   body:            string   — raw HTML from contenteditable
 *   deliveryType:    DeliveryType
 *   specificDate?:   string
 *   email:           string
 *   sessionId?:      string   — null if coach was skipped
 *   intentSummary?:  string   — null if coach was skipped
 *
 * Flow when coach was used (intentSummary exists):
 *   1. Show intent summary + self-assessment question + 4 feeling options
 *   2. Writer picks an option → show a warm closing message
 *   3. "Held back" → Go Back & Keep Writing | Seal As Is
 *      All others  → Seal This Letter
 *
 * Flow when coach was skipped (no intentSummary):
 *   1. Show simple affirmation + Seal button directly
 *
 * Route: /reflection  (protected)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation }         from 'react-router-dom';
import { supabase }                         from '../lib/supabaseClient';
import { useLetters }                       from '../hooks/useLetters';
import { generateDeliveryDate, formatDate } from '../lib/utils';
import type { DeliveryType, FontChoice, PaperStyle, SealDesign, SealColor } from '../types/letter';
import '../styles/global.css';
import '../styles/reflection.css';

// ---- Types -------------------------------------------------------

interface LocationState {
  title:          string;
  body:           string;
  deliveryType:   DeliveryType;
  specificDate?:  string;
  email:          string;
  sessionId?:     string | null;
  intentSummary?: string | null;
  font?:          FontChoice;
  paper?:         PaperStyle;
  sealDesign?:    SealDesign;
  sealColor?:     SealColor;
}

type Phase  = 'intent' | 'closing' | 'simple';
type Choice = 'all' | 'close' | 'unexpected' | 'held-back';

interface SealedInfo {
  deliveryType: DeliveryType;
  deliverAt:    string;
}

// ---- Static content ----------------------------------------------

const OPTIONS: { id: Choice; label: string }[] = [
  { id: 'all',        label: 'Yes, I said it all' },
  { id: 'close',      label: 'I got close' },
  { id: 'unexpected', label: 'I went somewhere unexpected' },
  { id: 'held-back',  label: 'I held back' },
];

const CLOSING: Record<Choice, string> = {
  'all':        'You put the right words on the page. This letter is ready.',
  'close':      "Letters rarely say everything — what you've captured is enough. It will reach them.",
  'unexpected': "Letters have a way of finding what matters most. Trust where yours went.",
  'held-back':  "Sometimes letters need another round. You can keep writing — or seal it as it is.",
};

// ---- Component ---------------------------------------------------

export function ReflectionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state    = (location.state ?? {}) as Partial<LocationState>;

  const { createLetter, triggerImmediateDelivery } = useLetters();

  const hasIntent = Boolean(state.intentSummary?.trim());

  const [phase,      setPhase]      = useState<Phase>(hasIntent ? 'intent' : 'simple');
  const [choice,     setChoice]     = useState<Choice | null>(null);
  const [sealing,    setSealing]    = useState(false);
  const [sealError,  setSealError]  = useState<string | null>(null);
  const [sealedInfo, setSealedInfo] = useState<SealedInfo | null>(null);

  useEffect(() => {
    document.title = 'A Reflection — Inkwell';
    if (!state.body) navigate('/compose', { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Seal the letter (save + deliver + link session) -----------

  const sealLetter = useCallback(async () => {
    if (sealing || !state.title || !state.body) return;
    setSealing(true);
    setSealError(null);

    try {
      const deliverAt = generateDeliveryDate(
        state.deliveryType ?? 'now',
        state.specificDate
      );

      const saved = await createLetter({
        title:           state.title,
        body:            state.body,
        recipient_email: state.email ?? '',
        deliver_at:      deliverAt,
        font:            state.font,
        paper:           state.paper,
        seal_design:     state.sealDesign,
        seal_color:      state.sealColor,
      });

      if (!saved) {
        setSealError('Something went wrong saving the letter. Please try again.');
        setSealing(false);
        return;
      }

      if (state.deliveryType === 'now') {
        await triggerImmediateDelivery(saved.id);
      }

      if (state.sessionId) {
        await supabase
          .from('writing_sessions')
          .update({ letter_id: saved.id })
          .eq('id', state.sessionId);
      }

      setSealedInfo({ deliveryType: state.deliveryType ?? 'now', deliverAt });
      setSealing(false);
    } catch (err) {
      console.error('[reflection seal]', err);
      setSealError('Something went wrong. Please try again.');
      setSealing(false);
    }
  }, [sealing, state, createLetter, triggerImmediateDelivery]);

  const handleGoBack = () => {
    navigate('/compose', {
      state: {
        returnTitle:   state.title,
        returnContent: state.body,
        sessionId:     state.sessionId,
        intentSummary: state.intentSummary,
        returnFont:    state.font,
        returnPaper:   state.paper,
        sealDesign:    state.sealDesign,
        sealColor:     state.sealColor,
      },
    });
  };

  const handleChoice = (c: Choice) => {
    setChoice(c);
    setPhase('closing');
  };

  const handleContinue = () => navigate('/dashboard', { replace: true });

  // ---- Redirect guard --------------------------------------------

  if (!state.body) return null;

  // ---- Sealed confirmation screen --------------------------------

  if (sealedInfo) {
    const { deliveryType, deliverAt } = sealedInfo;
    let confirmTitle   = 'Sealed.';
    let confirmMessage = '';

    if (deliveryType === 'now') {
      confirmTitle   = 'Sent.';
      confirmMessage = 'Your letter is on its way. The recipient will receive an invitation to read it shortly.';
    } else if (deliveryType === 'scheduled') {
      confirmMessage = `Your letter has been sealed. It will be delivered on ${formatDate(deliverAt)}.`;
    } else {
      confirmMessage = 'Your letter has been sealed. It will arrive as a surprise within the next 30 days.';
    }

    return (
      <div className="reflection-page desk-bg">
        <div className="reflection-sealed-card">
          <p className="reflection-eyebrow">
            {deliveryType === 'now' ? 'delivered' : 'scheduled'}
          </p>
          <h2 className="reflection-sealed-title">{confirmTitle}</h2>
          <p className="reflection-sealed-message">{confirmMessage}</p>
          <button
            className="reflection-btn-seal reflection-sealed-continue"
            onClick={handleContinue}
          >
            Continue to my letters
          </button>
        </div>
      </div>
    );
  }

  // ---- Main render -----------------------------------------------

  return (
    <>
      {sealing && (
        <div className="reflection-saving-overlay" aria-busy="true" aria-label="Sealing your letter">
          <p className="reflection-saving-text">Sealing…</p>
        </div>
      )}

      <div className="reflection-page desk-bg">
        <div className="reflection-card">

          {/* ---- Simple mode: no coach intent ---- */}
          {phase === 'simple' && (
            <>
              <p className="reflection-eyebrow">your letter is ready</p>
              <p className="reflection-text">
                You put something real on the page. That's what matters.
              </p>
              <div className="reflection-actions reflection-actions--visible">
                <button
                  className="reflection-btn-seal"
                  onClick={sealLetter}
                  disabled={sealing}
                >
                  Seal This Letter
                </button>
                {sealError && (
                  <p className="reflection-error" role="alert">{sealError}</p>
                )}
              </div>
            </>
          )}

          {/* ---- Intent phase: show summary + question + options ---- */}
          {phase === 'intent' && (
            <>
              <p className="reflection-eyebrow">before you seal</p>

              <div className="reflection-intent-block">
                <span className="reflection-intent-label">What you came to say</span>
                <p className="reflection-intent-text">{state.intentSummary}</p>
              </div>

              <p className="reflection-question">
                Did you say what you set out to say?
              </p>

              <div className="reflection-options" role="group" aria-label="Self-assessment options">
                {OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    className="reflection-option"
                    onClick={() => handleChoice(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button
                className="reflection-btn-skip"
                onClick={sealLetter}
                disabled={sealing}
              >
                Skip reflection and seal
              </button>
            </>
          )}

          {/* ---- Closing phase: message + action ---- */}
          {phase === 'closing' && choice && (
            <>
              <p className="reflection-eyebrow">a reflection</p>

              <p className="reflection-text">{CLOSING[choice]}</p>

              <div className="reflection-actions reflection-actions--visible">
                {choice === 'held-back' ? (
                  <div className="reflection-secondary-actions">
                    <button
                      className="reflection-btn-edit"
                      onClick={handleGoBack}
                      disabled={sealing}
                    >
                      Go Back &amp; Keep Writing
                    </button>
                    <button
                      className="reflection-btn-seal-as-is"
                      onClick={sealLetter}
                      disabled={sealing}
                    >
                      Seal As Is
                    </button>
                  </div>
                ) : (
                  <button
                    className="reflection-btn-seal"
                    onClick={sealLetter}
                    disabled={sealing}
                  >
                    Seal This Letter
                  </button>
                )}

                {sealError && (
                  <p className="reflection-error" role="alert">{sealError}</p>
                )}

                <button
                  className="reflection-btn-skip"
                  onClick={sealLetter}
                  disabled={sealing}
                >
                  Skip reflection and seal
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
