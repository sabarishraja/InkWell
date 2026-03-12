/**
 * PaperSheet.tsx — A single paper sheet in the typewriter.
 *
 * Renders the paper (with writing lines, date, salutation)
 * and houses the TypingArea + custom cursor.
 *
 * Manages its own load animation (translateY 100px → 0, opacity 0 → 1)
 * via a useEffect that adds 'sheet--loaded' after a brief delay.
 */

import { useEffect, useState } from 'react';
import { formatDate } from '../../lib/utils';
import { TypingArea } from './TypingArea';
import type { TypewriterController } from '../../hooks/useTypewriter';
import type { PaperStyle, InkColor } from '../../types/letter';

interface Props {
  tw:             TypewriterController;   // typewriter controller for this sheet
  paperStyle:     PaperStyle;
  inkColor:       InkColor;
  fontSize:       'normal' | 'large';
  recipientName:  string;
  isFirstPage:    boolean;                // only first page shows date + salutation
  loadDelay?:     number;                 // ms before slide-up animation starts
  sealStep:       string;                 // from useSealFlow — drives CSS classes
}

export function PaperSheet({
  tw,
  paperStyle,
  inkColor,
  fontSize,
  recipientName,
  isFirstPage,
  loadDelay = 200,
  sealStep,
}: Props) {
  const [loaded,      setLoaded]      = useState(false);
  const [dateVisible, setDateVisible] = useState(false);
  const [salVisible,  setSalVisible]  = useState(false);

  // Load animation sequence (matches original write.html timing)
  useEffect(() => {
    const t1 = setTimeout(() => setLoaded(true),      loadDelay);
    const t2 = setTimeout(() => setDateVisible(true), loadDelay + 600);
    const t3 = setTimeout(() => {
      setSalVisible(true);
      // Enable typing after all elements have settled
      tw.enable();
    }, loadDelay + 900);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const paperClass = [
    'paper',
    `paper-${paperStyle}`,
  ].join(' ');

  const sheetClass = [
    'page-sheet',
    loaded   ? 'sheet--loaded'   : '',
    sealStep === 'folded' || sealStep === 'modal' || sealStep === 'sending'
      ? 'paper--folded' : '',
    sealStep === 'flyaway'
      ? 'paper--flyaway' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={sheetClass}>
      <div className={paperClass}>
        {/* Writing lines (repeating gradient from global.css) */}
        <div className="paper-lines" aria-hidden="true" />

        {isFirstPage && (
          <>
            {/* Date — top right, not editable */}
            <div
              className={`paper-date ${dateVisible ? 'date--visible' : ''}`}
              aria-label={`Date: ${formatDate(new Date())}`}
            >
              {formatDate(new Date())}
            </div>

            {/* Salutation — pre-filled if recipient name was given */}
            {recipientName && (
              <div
                className={`paper-salutation ink-${inkColor} ${salVisible ? 'sal--visible' : ''}`}
                aria-hidden="true"
              >
                {`Dearest ${recipientName},`}
              </div>
            )}
          </>
        )}

        {/* Wax seal (shown during seal flow) */}
        <div
          className={[
            'wax-seal',
            sealStep === 'sealing' || sealStep === 'folded' || sealStep === 'modal' || sealStep === 'sending' || sealStep === 'flyaway'
              ? 'seal--drop' : '',
            sealStep === 'folded' || sealStep === 'modal'
              ? 'seal--ripple' : '',
          ].filter(Boolean).join(' ')}
          aria-hidden="true"
          style={{
            display: sealStep === 'idle' || sealStep === 'confirmed' ? 'none' : 'flex',
          }}
        >
          I
        </div>

        {/* Typing area + cursor */}
        <TypingArea
          typingAreaRef={tw.typingAreaRef}
          cursorRef={tw.cursorRef}
          marginFlashRef={tw.marginFlashRef}
          carriageSweepRef={tw.carriageSweepRef}
          inkColor={inkColor}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
}
