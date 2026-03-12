/**
 * TypingArea.tsx — The contenteditable writing surface + custom cursor.
 *
 * This component is deliberately uncontrolled (no React onChange/value).
 * All keyboard logic is managed imperatively by useTypewriter hook refs,
 * which is the correct React pattern for contenteditable.
 *
 * suppressContentEditableWarning silences React's warning about
 * uncontrolled contenteditable.
 */

import type { RefObject } from 'react';
import type { InkColor } from '../../types/letter';

interface Props {
  typingAreaRef:    RefObject<HTMLDivElement | null>;
  cursorRef:        RefObject<HTMLDivElement | null>;
  marginFlashRef:   RefObject<HTMLDivElement | null>;
  carriageSweepRef: RefObject<HTMLDivElement | null>;
  inkColor:         InkColor;
  fontSize:         'normal' | 'large';
}

// Font size variants mapped to paper CSS variables
const FONT_SIZE_MAP = {
  normal: 'var(--paper-font-size)',   // 22px
  large:  '26px',
};

export function TypingArea({
  typingAreaRef,
  cursorRef,
  marginFlashRef,
  carriageSweepRef,
  inkColor,
  fontSize,
}: Props) {
  const inkClass    = inkColor !== 'sepia' ? `ink-${inkColor}` : '';
  const fontSizeVal = FONT_SIZE_MAP[fontSize];

  return (
    <>
      {/* Carriage return sweep line (animates on Enter) */}
      <div
        ref={carriageSweepRef}
        className="carriage-sweep"
        aria-hidden="true"
      />

      {/* Right margin flash indicator */}
      <div
        ref={marginFlashRef}
        className="margin-flash"
        aria-hidden="true"
      />

      {/* The actual typing area — contenteditable, uncontrolled */}
      <div
        ref={typingAreaRef}
        className={`typing-area ${inkClass}`}
        contentEditable="true"
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Letter writing area"
        style={{ fontSize: fontSizeVal }}
        spellCheck={false}
        data-gramm="false"         /* Disable Grammarly extension */
        data-gramm_editor="false"
      />

      {/* Custom blinking cursor (replaces native caret) */}
      <div
        ref={cursorRef}
        className={`custom-cursor ${inkClass}`}
        aria-hidden="true"
      />
    </>
  );
}
