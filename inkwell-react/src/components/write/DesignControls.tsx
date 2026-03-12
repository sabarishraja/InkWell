/**
 * DesignControls.tsx — Floating panel for paper style, ink color, and font size.
 *
 * Fixed to the bottom-left of the desk. Expandable via a toggle button.
 * Changes are immediately reflected on the paper via parent state.
 */

import { useState } from 'react';
import type { PaperStyle, InkColor } from '../../types/letter';

interface Props {
  paperStyle:    PaperStyle;
  inkColor:      InkColor;
  fontSize:      'normal' | 'large';
  onPaperChange: (style: PaperStyle)         => void;
  onInkChange:   (ink: InkColor)             => void;
  onSizeChange:  (size: 'normal' | 'large')  => void;
}

const PAPERS: { value: PaperStyle; label: string }[] = [
  { value: 'parchment', label: 'Parchment' },
  { value: 'linen',     label: 'Linen'     },
  { value: 'aged',      label: 'Aged'      },
];

const INKS: { value: InkColor; label: string }[] = [
  { value: 'sepia',    label: 'Sepia ink'    },
  { value: 'navy',     label: 'Navy ink'     },
  { value: 'midnight', label: 'Midnight ink' },
];

export function DesignControls({
  paperStyle,
  inkColor,
  fontSize,
  onPaperChange,
  onInkChange,
  onSizeChange,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`design-controls ${open ? 'controls--open' : ''}`}
      role="region"
      aria-label="Paper and ink settings"
    >
      {/* Toggle button */}
      <button
        className="controls-toggle"
        aria-expanded={open}
        aria-controls="controls-body"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close design controls' : 'Open design controls'}
      >
        <span className="controls-toggle__icon" aria-hidden="true">
          <span /><span /><span />
        </span>
        Style
      </button>

      {/* Expandable body */}
      <div className="controls-body" id="controls-body" hidden={!open}>
        {/* Paper section */}
        <div className="controls-section">
          <div className="controls-label">Paper</div>
          <div className="paper-swatches" role="group" aria-label="Paper style">
            {PAPERS.map(({ value, label }) => (
              <button
                key={value}
                className={`paper-swatch ${paperStyle === value ? 'swatch--active' : ''}`}
                data-paper={value}
                aria-label={label}
                aria-pressed={paperStyle === value}
                onClick={() => onPaperChange(value)}
              />
            ))}
          </div>
        </div>

        {/* Ink section */}
        <div className="controls-section">
          <div className="controls-label">Ink</div>
          <div className="ink-dots" role="group" aria-label="Ink color">
            {INKS.map(({ value, label }) => (
              <button
                key={value}
                className={`ink-dot ${inkColor === value ? 'swatch--active' : ''}`}
                data-ink={value}
                aria-label={label}
                aria-pressed={inkColor === value}
                onClick={() => onInkChange(value)}
              />
            ))}
          </div>
        </div>

        {/* Size section */}
        <div className="controls-section">
          <div className="controls-label">Size</div>
          <div className="size-toggles" role="group" aria-label="Font size">
            <button
              className={`size-toggle ${fontSize === 'normal' ? 'swatch--active' : ''}`}
              aria-pressed={fontSize === 'normal'}
              onClick={() => onSizeChange('normal')}
            >
              Fine
            </button>
            <button
              className={`size-toggle ${fontSize === 'large' ? 'swatch--active' : ''}`}
              aria-pressed={fontSize === 'large'}
              onClick={() => onSizeChange('large')}
            >
              Broad
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
