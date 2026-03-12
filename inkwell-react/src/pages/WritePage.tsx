/**
 * WritePage.tsx — The core typewriter writing experience.
 *
 * Orchestrates: pre-write modal → paper load → writing → seal flow → vault redirect.
 * Composes: PreWriteModal, PaperSheet, DesignControls, NudgeButton, SealModal, MuteToggle.
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/write.css';
import { Nav }            from '../components/layout/Nav';
import { PreWriteModal }  from '../components/write/PreWriteModal';
import { PaperSheet }     from '../components/write/PaperSheet';
import { DesignControls } from '../components/write/DesignControls';
import { NudgeButton }    from '../components/write/NudgeButton';
import { SealModal }      from '../components/write/SealModal';
import { MuteToggle }     from '../components/write/MuteToggle';
import { useTypewriter }  from '../hooks/useTypewriter';
import { useAudio }       from '../hooks/useAudio';
import { useSealFlow }    from '../hooks/useSealFlow';
import { htmlToPlain }    from '../lib/utils';
import type { PaperStyle, InkColor, DeliveryType } from '../types/letter';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export function WritePage() {
  const navigate = useNavigate();

  // ---- Session state -----------------------------------------------
  const [sessionStarted, setSessionStarted] = useState(false);
  const [recipientName,  setRecipientName]  = useState('');

  // ---- Design preferences (lifted from DesignControls) -------------
  const [paperStyle, setPaperStyle] = useState<PaperStyle>('parchment');
  const [inkColor,   setInkColor]   = useState<InkColor>('sepia');
  const [fontSize,   setFontSize]   = useState<'normal' | 'large'>('normal');

  // ---- Character count (for seal button visibility) ----------------
  const [charCount, setCharCount] = useState(0);
  const charCountRef = useRef(0);

  // ---- Audio hook --------------------------------------------------
  const audio = useAudio();

  // ---- Typewriter hook ---------------------------------------------
  const tw = useTypewriter({
    audio,
    onContentChange: () => {
      // Update charCount for seal button without full re-render every keystroke
      const count = tw.getCharCount();
      if (count !== charCountRef.current) {
        charCountRef.current = count;
        setCharCount(count);
      }
    },
    onLineThresholdReached: () => {
      // Multi-page: lock current sheet and trigger new one
      // (simplified: just alert for now — full multi-page is a future enhancement)
      tw.resetThreshold();
    },
  });

  // ---- Seal flow hook ----------------------------------------------
  const seal = useSealFlow({
    recipientName,
    getPaperStyle: () => paperStyle,
    getInkColor:   () => inkColor,
    getContent:    () => tw.getContent(),
    onPlayTear:    () => audio.playPaperTear(),
    onSaved:       (_id) => {
      // Navigate to vault after confirmation message holds
      setTimeout(() => navigate('/vault'), 2200);
    },
  });

  // ---- Handlers ----------------------------------------------------
  const handleBegin = useCallback((name: string) => {
    setRecipientName(name);
    setSessionStarted(true);
  }, []);

  const handleSend = useCallback(
    ({ deliveryType, specificDate, email }: {
      deliveryType: DeliveryType;
      specificDate?: string;
      email: string;
    }) => {
      tw.setReadOnly(true);
      seal.handleSend({ deliveryType, specificDate, email });
    },
    [seal, tw]
  );

  const handleUnfold = useCallback(() => {
    seal.unfold();
    tw.setReadOnly(false);
  }, [seal, tw]);

  const getLetterText = useCallback(() => htmlToPlain(tw.getContent()), [tw]);

  // ---- Confirmation message ----------------------------------------
  if (seal.step === 'confirmed') {
    return (
      <div className="seal-confirmation confirm--visible" role="status" aria-live="assertive">
        <p className="seal-confirmation__text">
          It&rsquo;s sealed. It will find its way.
        </p>
      </div>
    );
  }

  return (
    <div className="desk-bg write-page">
      <Nav />

      {/* Pre-write modal */}
      {!sessionStarted && <PreWriteModal onBegin={handleBegin} />}

      {/* Writing desk */}
      <main className="write-desk" aria-label="Writing desk">
        {/* Typewriter frame */}
        <div className="typewriter-frame" role="region" aria-label="Typewriter">
          {/* Paper guide with chrome rollers */}
          <div className="paper-guide" aria-hidden="true">
            <div className="paper-slot" />
          </div>

          {/* Pages container (scrollable, holds paper sheets) */}
          <div className="pages-container" aria-label="Letter pages">
            {sessionStarted && (
              <PaperSheet
                tw={tw}
                paperStyle={paperStyle}
                inkColor={inkColor}
                fontSize={fontSize}
                recipientName={recipientName}
                isFirstPage={true}
                loadDelay={200}
                sealStep={seal.step}
              />
            )}
          </div>
        </div>

        {/* Keyboard hints */}
        <p className="keyboard-hints" aria-label="Keyboard shortcuts">
          [ ENTER ] Carriage Return &nbsp;|&nbsp; [ BACKSPACE ] Delete
        </p>
      </main>

      {/* Design controls panel — bottom left */}
      <DesignControls
        paperStyle={paperStyle}
        inkColor={inkColor}
        fontSize={fontSize}
        onPaperChange={setPaperStyle}
        onInkChange={setInkColor}
        onSizeChange={setFontSize}
      />

      {/* AI nudge + seal buttons — bottom right */}
      {sessionStarted && (
        <>
          <NudgeButton
            getLetterText={getLetterText}
            recipientName={recipientName}
            supabaseUrl={SUPABASE_URL}
          />

          <button
            className={`seal-btn ${charCount >= 20 ? 'seal-btn--visible' : ''}`}
            onClick={() => {
              tw.setReadOnly(true);
              seal.startSeal();
            }}
            aria-label="Seal the letter"
            disabled={seal.step !== 'idle'}
          >
            Seal the Letter
          </button>
        </>
      )}

      {/* Mute toggle — top right */}
      <MuteToggle audio={audio} />

      {/* Seal delivery modal */}
      <SealModal
        visible={seal.step === 'modal'}
        onSend={handleSend}
        onCancel={handleUnfold}
      />
    </div>
  );
}
