/**
 * SealPicker.tsx — Pre-seal design + color picker.
 *
 * Shown when the user clicks "Seal Letter", before the wax animation starts.
 * The user picks one of five seal designs and one of five wax colors, then
 * confirms with "Seal it". Defaults to heart in classic red so users who want
 * to move quickly can confirm immediately.
 */

import { useState } from 'react';
import type { SealDesign, SealColor } from '../../types/letter';

// ---- Color + design data (exported for ComposePage wax seal rendering) ----

export interface WaxColorOption {
  id:    SealColor;
  label: string;
  light: string;
  dark:  string;
}

export const WAX_COLORS: WaxColorOption[] = [
  { id: 'classic-red',  label: 'Classic Red',   light: '#8B1A1A', dark: '#4A0808' },
  { id: 'burgundy',     label: 'Deep Burgundy', light: '#7A1030', dark: '#3D0018' },
  { id: 'gold',         label: 'Gold',           light: '#C49A28', dark: '#7B6000' },
  { id: 'forest-green', label: 'Forest Green',  light: '#1A5A20', dark: '#0A3010' },
  { id: 'navy',         label: 'Navy',           light: '#102060', dark: '#060E30' },
];

interface SealDesignOption {
  id:     SealDesign;
  label:  string;
  src?:   string;  // undefined → render monogram text instead
}

const SEAL_DESIGNS: SealDesignOption[] = [
  { id: 'flower',         label: 'Flower',        src: '/assets/seals/flower.svg'        },
  { id: 'infinity-heart', label: 'Infinity Heart', src: '/assets/seals/infinity_heart.svg' },
  { id: 'floral',         label: 'Floral Sprig',  src: '/assets/seals/floral.svg'        },
  { id: 'heart',          label: 'Heart',          src: '/assets/seals/heart.svg'         },
  { id: 'monogram',       label: 'Monogram',       src: undefined                         },
];

// ---- Helpers ---------------------------------------------------------------

/** Derive 1- or 2-letter monogram from a display name. */
export function getMonogram(displayName: string | null | undefined): string {
  if (!displayName?.trim()) return '?';
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Build a wax gradient string for a given color id. */
export function waxGradient(colorId: SealColor): string {
  const c = WAX_COLORS.find(x => x.id === colorId) ?? WAX_COLORS[0];
  return `radial-gradient(circle at 35% 35%, ${c.light}, ${c.dark})`;
}

// ---- Component -------------------------------------------------------------

interface Props {
  visible:    boolean;
  monogram:   string;  // Pre-computed by ComposePage from auth user
  onConfirm:  (design: SealDesign, color: SealColor) => void;
  onCancel:   () => void;
}

export function SealPicker({ visible, monogram, onConfirm, onCancel }: Props) {
  const [design, setDesign] = useState<SealDesign>('heart');
  const [color,  setColor]  = useState<SealColor>('classic-red');

  const gradient = waxGradient(color);

  return (
    <div
      className={`seal-picker-overlay ${visible ? 'picker--active' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="seal-picker-title"
      aria-hidden={!visible}
    >
      <div className="seal-picker">

        <h2 id="seal-picker-title" className="seal-picker__title">
          Choose your seal
        </h2>

        {/* ---- Seal design row ---- */}
        <div className="seal-picker__designs" role="group" aria-label="Seal design">
          {SEAL_DESIGNS.map(opt => (
            <button
              key={opt.id}
              className={`seal-design-btn ${design === opt.id ? 'design--selected' : ''}`}
              style={{ background: gradient }}
              onClick={() => setDesign(opt.id)}
              aria-label={opt.label}
              aria-pressed={design === opt.id}
              title={opt.label}
              type="button"
            >
              {opt.src ? (
                <img
                  src={opt.src}
                  alt=""
                  className="seal-design-img"
                  aria-hidden="true"
                />
              ) : (
                <span className="seal-monogram" aria-hidden="true">
                  {monogram}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ---- Wax color row ---- */}
        <div className="seal-picker__colors" role="group" aria-label="Wax color">
          {WAX_COLORS.map(opt => (
            <button
              key={opt.id}
              className={`seal-color-btn ${color === opt.id ? 'color--selected' : ''}`}
              style={{ background: `radial-gradient(circle at 35% 35%, ${opt.light}, ${opt.dark})` }}
              onClick={() => setColor(opt.id)}
              aria-label={opt.label}
              aria-pressed={color === opt.id}
              title={opt.label}
              type="button"
            />
          ))}
        </div>

        {/* ---- Actions ---- */}
        <div className="seal-picker__actions">
          <button
            className="btn-seal-confirm"
            type="button"
            onClick={() => onConfirm(design, color)}
          >
            Seal it
          </button>
          <button
            className="btn-picker-cancel"
            type="button"
            onClick={onCancel}
          >
            cancel
          </button>
        </div>

      </div>
    </div>
  );
}
