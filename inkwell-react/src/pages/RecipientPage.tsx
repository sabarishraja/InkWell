// @ts-nocheck — superseded page, kept for reference only
/**
 * RecipientPage.tsx — Private letter reading experience.
 *
 * No navigation bar. No branding. Just the letter.
 *
 * Reveal sequence:
 * 1. 500ms black screen
 * 2. "You have a letter." fades in, holds 1500ms, fades out
 * 3. Paper slides up, date appears
 * 4. Letter text replays character by character at 45ms/char
 * 5. Ambient sound plays during replay, fades out after
 * 6. "Written with Inkwell." footer fades in
 */

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/recipient.css';
import { getLetter, markOpened } from '../services/lettersService';
import { useAudio } from '../hooks/useAudio';
import { htmlToPlain, formatDate } from '../lib/utils';
import type { Letter } from '../types/letter';

type RevealStep =
  | 'black'        // Initial black screen
  | 'intro'        // "You have a letter."
  | 'paper'        // Paper visible, typing starts
  | 'complete'     // Typing done
  | 'error';       // Letter not found

export function RecipientPage() {
  const { id }                          = useParams<{ id: string }>();
  const [step,        setStep]          = useState<RevealStep>('black');
  const [letter,      setLetter]        = useState<Letter | null>(null);
  const [typedText,   setTypedText]     = useState('');
  const [dateVisible, setDateVisible]   = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [cursorDone,  setCursorDone]    = useState(false);
  const audio                           = useAudio();
  const replayRef                       = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    document.title = 'You have a letter — Inkwell';
    loadLetter();
  }, [id]);

  async function loadLetter() {
    if (!id) { setStep('error'); return; }

    const found = await getLetter(id);
    if (!found) { setStep('error'); return; }

    setLetter(found);
    await markOpened(id);
    beginReveal(found);
  }

  function beginReveal(l: Letter) {
    // Step 1: black for 500ms
    setTimeout(() => {
      // Step 2: intro message
      setStep('intro');

      setTimeout(() => {
        // Step 3: fade out intro, show paper
        setStep('paper');
        audio.startAmbientLoop();

        setTimeout(() => setDateVisible(true), 700);

        // Step 4: replay letter text
        const plainText = htmlToPlain(l.content);
        let i = 0;
        const SPEED = 45; // ms per character

        const tick = () => {
          if (i >= plainText.length) {
            // Step 5: typing complete
            setStep('complete');
            setCursorDone(true);
            audio.stopAmbientLoop(3000);
            setTimeout(() => setFooterVisible(true), 2000);
            return;
          }
          setTypedText(plainText.slice(0, ++i));
          const timer = setTimeout(tick, SPEED);
          replayRef.current = { stop: () => clearTimeout(timer) };
        };

        const startDelay = setTimeout(tick, 1200);
        replayRef.current = { stop: () => clearTimeout(startDelay) };
      }, 2000);
    }, 500);
  }

  // Click anywhere to skip replay
  const handleSkip = () => {
    if (step !== 'paper' || !letter) return;
    replayRef.current?.stop();
    const plainText = htmlToPlain(letter.content);
    setTypedText(plainText);
    setStep('complete');
    setCursorDone(true);
    audio.stopAmbientLoop(1000);
    setTimeout(() => setFooterVisible(true), 1000);
  };

  // ---- Error state --------------------------------------------------
  if (step === 'error') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0D0B09' }}>
        <div className="recipient-error error--visible" role="alert">
          <p>
            This letter has not arrived yet,<br />or the link has expired.
          </p>
        </div>
      </div>
    );
  }

  const inkClass = letter?.ink_color && letter.ink_color !== 'sepia'
    ? `ink-${letter.ink_color}` : '';

  const paperClass = [
    'paper',
    letter?.paper_style ? `paper-${letter.paper_style}` : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className="recipient-page"
      onClick={handleSkip}
      aria-label="Click to skip letter replay"
    >
      {/* Intro message overlay */}
      <div
        className={`recipient-intro ${step === 'intro' ? 'intro--visible' : ''}`}
        role="status"
        aria-live="polite"
        aria-label="You have a letter"
      >
        <p className="intro-text">You have a letter.</p>
      </div>

      {/* Paper wrapper */}
      <div
        className={`letter-wrapper ${step === 'paper' || step === 'complete' ? 'letter--visible' : ''}`}
        aria-label="Your letter"
        role="article"
      >
        <div className={paperClass}>
          <div className="paper-lines" aria-hidden="true" />

          {/* Date */}
          <div
            className={`recipient-date ${dateVisible ? 'el--visible' : ''}`}
            aria-label={letter ? `Written ${formatDate(letter.created_at)}` : ''}
          >
            {letter ? formatDate(letter.created_at) : ''}
          </div>

          {/* Letter text with replay cursor */}
          <div
            className={`recipient-text ${inkClass}`}
            aria-live="polite"
            aria-label="Letter content"
          >
            {typedText}
            {/* Blinking cursor that disappears on completion */}
            {!cursorDone && (
              <span
                className={`replay-cursor ${inkClass}`}
                aria-hidden="true"
              />
            )}
            {cursorDone && (
              <span
                className={`replay-cursor cursor--done ${inkClass}`}
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      </div>

      {/* Branding footer */}
      <footer
        className={`recipient-footer ${footerVisible ? 'footer--visible' : ''}`}
        aria-label="Written with Inkwell"
      >
        <p>Written with Inkwell.</p>
      </footer>
    </div>
  );
}
